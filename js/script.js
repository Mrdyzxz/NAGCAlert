document.addEventListener("DOMContentLoaded", () => {
    const getStartedBtn = document.getElementById("getStartedBtn");
    const closeAuthBtn = document.getElementById("closeAuthBtn");
    const authPanel = document.getElementById("authPanel");
    const authOverlay = document.getElementById("authOverlay");

    const loginTab = document.getElementById("loginTab");
    const signupTab = document.getElementById("signupTab");
    const loginForm = document.getElementById("loginForm");
    const signupForm = document.getElementById("signupForm");

    const authEyebrow = document.getElementById("authEyebrow");
    const authTitle = document.getElementById("authTitle");
    const authDescription = document.getElementById("authDescription");

    const loginFeedback = document.getElementById("loginFeedback");
    const signupFeedback = document.getElementById("signupFeedback");

    function openAuthPanel() {
        authPanel.classList.add("is-open");
        authOverlay.classList.add("is-visible");
        authPanel.setAttribute("aria-hidden", "false");
        authOverlay.setAttribute("aria-hidden", "false");
        authPanel.inert = false;
        document.body.classList.add("panel-open");
        showLogin();

        setTimeout(() => {
            document.getElementById("loginEmail").focus();
        }, 150);
    }

    function closeAuthPanel() {
        authPanel.classList.remove("is-open");
        authOverlay.classList.remove("is-visible");
        authPanel.setAttribute("aria-hidden", "true");
        authOverlay.setAttribute("aria-hidden", "true");
        authPanel.inert = true;
        document.body.classList.remove("panel-open");
        getStartedBtn.focus();
    }

    function showLogin() {
        loginTab.classList.add("active");
        signupTab.classList.remove("active");
        loginTab.setAttribute("aria-selected", "true");
        signupTab.setAttribute("aria-selected", "false");
        loginForm.hidden = false;
        signupForm.hidden = true;
        authEyebrow.textContent = "WELCOME BACK";
        authTitle.textContent = "Access your account";
        authDescription.textContent =
            "Sign in to access the NAGCAlert administration portal.";
        loginFeedback.textContent = "";
        signupFeedback.textContent = "";
    }

    function showSignup() {
        signupTab.classList.add("active");
        loginTab.classList.remove("active");
        signupTab.setAttribute("aria-selected", "true");
        loginTab.setAttribute("aria-selected", "false");
        signupForm.hidden = false;
        loginForm.hidden = true;
        authEyebrow.textContent = "REQUEST ACCESS";
        authTitle.textContent = "Create an account request";
        authDescription.textContent =
            "Create an account. Administrator access requires separate approval.";
        loginFeedback.textContent = "";
        signupFeedback.textContent = "";
    }

    function showFeedback(element, message) {
        element.textContent = message;
    }

    function friendlyError(error) {
        if (!error) return "Something went wrong. Please try again.";

        const message = error.message || "";
        const lowerMessage = message.toLowerCase();

        if (lowerMessage.includes("invalid login credentials")) {
            return "Incorrect email or password.";
        }

        if (lowerMessage.includes("email not confirmed")) {
            return "Please confirm your email before logging in.";
        }

        if (lowerMessage.includes("already registered")) {
            return "This email is already registered. Try logging in.";
        }

        return message || "Something went wrong. Please try again.";
    }

    // Verify that the signed-in account is registered as an admin.
    async function isAdmin() {
        const { data, error } = await supabaseClient.rpc(
            "is_nagcalert_admin"
        );

        if (error) {
            console.error("Admin verification failed:", error);
            throw new Error(
                "Could not verify administrator access. Check your Supabase policies and try again."
            );
        }

        return data === true;
    }

    getStartedBtn.addEventListener("click", openAuthPanel);
    closeAuthBtn.addEventListener("click", closeAuthPanel);
    authOverlay.addEventListener("click", closeAuthPanel);
    loginTab.addEventListener("click", showLogin);
    signupTab.addEventListener("click", showSignup);

    document.addEventListener("keydown", (event) => {
        if (
            event.key === "Escape" &&
            authPanel.classList.contains("is-open")
        ) {
            closeAuthPanel();
        }
    });

    // LOGIN
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const button = loginForm.querySelector('button[type="submit"]');
        button.disabled = true;
        showFeedback(loginFeedback, "Verifying account...");

        try {
            const email = document.getElementById("loginEmail").value.trim();
            const password = document.getElementById("loginPassword").value;

            const { error } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            const admin = await isAdmin();

            if (!admin) {
                await supabaseClient.auth.signOut();
                showFeedback(
                    loginFeedback,
                    "Your account does not have administrator access. Please contact the system administrator."
                );
                return;
            }

            window.location.href = "dashboard.html";
        } catch (error) {
            console.error("Login error:", error);
            showFeedback(loginFeedback, friendlyError(error));
        } finally {
            button.disabled = false;
        }
    });

    // SIGN UP — creates an admin access request, not admin privileges.
    signupForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const button = signupForm.querySelector('button[type="submit"]');
        button.disabled = true;
        showFeedback(signupFeedback, "Creating your account request...");

        try {
            const name = document.getElementById("signupName").value.trim();
            const email = document.getElementById("signupEmail").value.trim();
            const password = document.getElementById("signupPassword").value;

            if (!name || !email || !password) {
                throw new Error("Please complete all required fields.");
            }

            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: name,
                        requested_role: "admin"
                    }
                }
            });

            if (error) throw error;

            // If email confirmation is disabled, sign out so the new
            // account does not remain logged in as an unapproved applicant.
            if (data.session) {
                const { error: signOutError } =
                    await supabaseClient.auth.signOut();

                if (signOutError) {
                    console.error(
                        "Could not sign out new applicant:",
                        signOutError
                    );
                }
            }

            showFeedback(
                signupFeedback,
                "Your account registration was submitted. If email confirmation is required, please confirm your email. Administrator access remains pending until an authorized admin approves your request."
            );

            signupForm.reset();
        } catch (error) {
            console.error("Sign-up error:", error);
            showFeedback(signupFeedback, friendlyError(error));
        } finally {
            button.disabled = false;
        }
    });

    // The dashboard independently checks the current session and admin status.
});