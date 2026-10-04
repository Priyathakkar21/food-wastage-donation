const API_URL = "http://localhost:5000/api";


// ==========================================
// GET TOKEN
// ==========================================

function getToken() {
    return localStorage.getItem("token");
}


// ==========================================
// GET USER
// ==========================================

function getUser() {
    try {
        return JSON.parse(
            localStorage.getItem("user") || "null"
        );
    } catch (error) {
        return null;
    }
}


// ==========================================
// REQUIRE LOGIN
// ==========================================

function requireLogin() {

    if (!getToken()) {
        window.location.href = "login.html";
        return false;
    }

    return true;
}


// ==========================================
// LOGOUT
// ==========================================

function logout() {

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    window.location.href = "index.html";
}


// ==========================================
// SHOW / HIDE ADMIN MENU
// ==========================================

function updateAdminMenu() {

    const adminMenu =
        document.getElementById("adminMenu");

    const user = getUser();

    if (!adminMenu) {
        return;
    }

    if (user && user.role === "admin") {
        adminMenu.style.display = "inline";
    } else {
        adminMenu.style.display = "none";
    }
}


// ==========================================
// PAGE LOAD
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    // Logout buttons
    document
        .querySelectorAll("#logoutBtn")
        .forEach((btn) => {
            btn.addEventListener("click", logout);
        });


    // Protected pages
    const protectedPages = [
        "dashboard.html",
        "donate.html",
        "donations.html",
        "profile.html",
        "history.html",
        "about.html",
        "contact.html",
        "admin.html",
        "ngo-dashboard.html",
        "requests.html"
    ];


    const page =
        window.location.pathname
            .split("/")
            .pop();


    if (
        protectedPages.includes(page) &&
        !requireLogin()
    ) {
        return;
    }


    const user = getUser();


    // Admin menu
    updateAdminMenu();


    // User name
    const userName =
        document.getElementById("userName");

    if (userName && user) {
        userName.textContent = user.name;
    }


    // Profile
    const profileName =
        document.getElementById("profileName");

    const profileEmail =
        document.getElementById("profileEmail");

    const profileRole =
        document.getElementById("profileRole");


    if (user) {

        if (profileName) {
            profileName.value = user.name;
            profileName.textContent = user.name;
        }

        if (profileEmail) {
            profileEmail.value = user.email;
            profileEmail.textContent = user.email;
        }

        if (profileRole) {
            profileRole.value = user.role;
            profileRole.textContent = user.role;
        }
    }


    // Register
    const registerForm =
        document.getElementById("registerForm");

    if (registerForm) {
        registerForm.addEventListener(
            "submit",
            handleRegister
        );
    }


    // Login
    const loginForm =
        document.getElementById("loginForm");

    if (loginForm) {
        loginForm.addEventListener(
            "submit",
            handleLogin
        );
    }


    // Donation
    const donationForm =
        document.getElementById("donationForm");

    if (donationForm) {
        donationForm.addEventListener(
            "submit",
            handleDonation
        );
    }


    // Available donations
    if (
        document.getElementById("allDonations")
    ) {
        loadDonations();
    }


    // Donation count
    if (
        document.getElementById("donationCount")
    ) {
        loadCount();
    }


    // Collection history
    if (
        document.getElementById("collectionHistory")
    ) {
        loadCollectionHistory();
    }


    // NGO dashboard
    if (page === "ngo-dashboard.html") {

        const currentUser = getUser();

        if (
            !currentUser ||
            currentUser.role !== "ngo"
        ) {

            alert("NGO access required.");

            window.location.href =
                "dashboard.html";

            return;
        }

        loadNGODashboard();
    }


    // Requests page
    if (
        document.getElementById("requestsList")
    ) {
        loadRequests();
    }


    // Admin page
    if (
        document.getElementById("adminDonations")
    ) {
        loadAdminPanel();
    }

});


// ==========================================
// REGISTER
// ==========================================

async function handleRegister(e) {

    e.preventDefault();

    const msg =
        document.getElementById("registerMessage");

    if (msg) {
        msg.textContent = "Creating account...";
    }


    const roleElement =
        document.getElementById("registerRole");

    const role =
        roleElement
            ? roleElement.value
            : "donor";


    if (!["donor", "ngo"].includes(role)) {

        if (msg) {
            msg.textContent =
                "Please select a valid role.";
        }

        return;
    }


    try {

        const res = await fetch(
            `${API_URL}/auth/register`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    name:
                        document.getElementById(
                            "registerName"
                        ).value,

                    email:
                        document.getElementById(
                            "registerEmail"
                        ).value,

                    password:
                        document.getElementById(
                            "registerPassword"
                        ).value,

                    role: role
                })
            }
        );


        const data = await res.json();


        if (msg) {
            msg.textContent =
                data.message ||
                "Registration complete.";
        }


        if (res.ok) {

            setTimeout(() => {

                window.location.href =
                    "login.html";

            }, 700);
        }

    } catch (error) {

        console.error(error);

        if (msg) {
            msg.textContent =
                "Cannot connect to backend server.";
        }
    }
}


// ==========================================
// LOGIN
// ==========================================

async function handleLogin(e) {

    e.preventDefault();

    const msg =
        document.getElementById("loginMessage");

    if (msg) {
        msg.textContent = "Logging in...";
    }


    try {

        const res = await fetch(
            `${API_URL}/auth/login`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    email:
                        document.getElementById(
                            "loginEmail"
                        ).value,

                    password:
                        document.getElementById(
                            "loginPassword"
                        ).value
                })
            }
        );


        const data = await res.json();


        if (!res.ok) {

            if (msg) {
                msg.textContent =
                    data.message ||
                    "Login failed.";
            }

            return;
        }


        // Save token
        localStorage.setItem(
            "token",
            data.token
        );


        // Save user
        localStorage.setItem(
            "user",
            JSON.stringify(data.user)
        );


        // Redirect based on role
        if (data.user.role === "ngo") {

            window.location.href =
                "ngo-dashboard.html";

        } else {

            window.location.href =
                "dashboard.html";
        }

    } catch (error) {

        console.error(error);

        if (msg) {
            msg.textContent =
                "Cannot connect to backend server.";
        }
    }
}


// ==========================================
// ADD FOOD DONATION
// ==========================================

async function handleDonation(e) {

    e.preventDefault();


    if (!requireLogin()) {
        return;
    }


    const user = getUser();


    // NGO cannot donate
    if (
        user &&
        user.role === "ngo"
    ) {

        alert(
            "NGO users cannot donate food."
        );

        return;
    }


    const msg =
        document.getElementById(
            "donationMessage"
        );


    if (msg) {
        msg.textContent = "Submitting...";
    }


    try {

        const res = await fetch(
            `${API_URL}/donations`,
            {
                method: "POST",

                headers: {

                    "Content-Type":
                        "application/json",

                    "Authorization":
                        `Bearer ${getToken()}`
                },

                body: JSON.stringify({

                    foodName:
                        document.getElementById(
                            "foodName"
                        ).value,

                    quantity:
                        document.getElementById(
                            "quantity"
                        ).value,

                    location:
                        document.getElementById(
                            "location"
                        ).value,

                    description:
                        document.getElementById(
                            "description"
                        ).value
                })
            }
        );


        const data = await res.json();


        if (msg) {
            msg.textContent =
                data.message ||
                "Donation submitted.";
        }


        if (res.ok) {
            e.target.reset();
        }

    } catch (error) {

        console.error(error);

        if (msg) {
            msg.textContent =
                "Cannot connect to backend server.";
        }
    }
}


// ==========================================
// LOAD ALL DONATIONS
// ==========================================

async function loadDonations() {

    const box =
        document.getElementById(
            "allDonations"
        );


    if (!box) {
        return;
    }


    box.innerHTML =
        "<p>Loading donations...</p>";


    try {

        const res = await fetch(
            `${API_URL}/donations`
        );


        const donations =
            await res.json();


        if (!res.ok) {
            throw new Error(
                donations.message ||
                "Unable to load donations"
            );
        }


        if (
            !Array.isArray(donations) ||
            donations.length === 0
        ) {

            box.innerHTML = `
                <div class="donation-card">
                    <p>No donations available yet.</p>
                </div>
            `;

            return;
        }


        const currentUser = getUser();


        box.innerHTML =
            donations
                .map((d) => {

                    const isAvailable =
                        d.status === "Available";


                    const donorId =
                        d.donor?._id ||
                        d.donor;


                    const isMyDonation =
                        currentUser &&
                        donorId === getUserId();


                    return `

                        <article class="donation-card">

                            <h3>
                                ${escapeHtml(
                                    d.foodName
                                )}
                            </h3>

                            <p>
                                <b>Quantity:</b>
                                ${d.quantity}
                            </p>

                            <p>
                                <b>Location:</b>
                                ${escapeHtml(
                                    d.location
                                )}
                            </p>

                            <p>
                                <b>Description:</b>
                                ${escapeHtml(
                                    d.description ||
                                    "No description"
                                )}
                            </p>

                            <p>
                                <b>Donated by:</b>
                                ${escapeHtml(
                                    d.donor?.name ||
                                    "User"
                                )}
                            </p>

                            <p>
                                <b>Status:</b>
                                <span class="status">
                                    ${escapeHtml(
                                        d.status
                                    )}
                                </span>
                            </p>

                            ${
                                isAvailable
                                    ? (
                                        isMyDonation
                                            ? `
                                                <p>
                                                    <b>
                                                        This is your donation.
                                                    </b>
                                                </p>
                                            `
                                            : (
                                                currentUser?.role === "ngo"
                                                    ? `
                                                        <button
                                                            onclick="requestFood('${d._id}')"
                                                        >
                                                            Request Food
                                                        </button>
                                                    `
                                                    : `
                                                        <p>
                                                            NGO users can request this food.
                                                        </p>
                                                    `
                                            )
                                    )
                                    : `
                                        <p>
                                            <b>Status:</b>
                                            ${escapeHtml(d.status)}
                                        </p>
                                    `
                            }

                        </article>
                    `;

                })
                .join("");


    } catch (error) {

        console.error(error);

        box.innerHTML = `
            <div class="donation-card">
                <p>
                    Backend server is not available.
                </p>
            </div>
        `;
    }
}


// ==========================================
// REQUEST FOOD
// ==========================================

async function requestFood(donationId) {

    const quantity =
        prompt(
            "Enter required quantity:"
        );


    if (!quantity) {
        return;
    }


    const requestedQuantity =
        Number(quantity);


    if (
        !Number.isFinite(requestedQuantity) ||
        requestedQuantity <= 0
    ) {

        alert(
            "Please enter a valid quantity."
        );

        return;
    }


    const message =
        prompt(
            "Enter a message for the donor (optional):"
        ) || "";


    try {

        const response =
            await fetch(
                `${API_URL}/requests`,
                {
                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${getToken()}`
                    },

                    body: JSON.stringify({

                        donation:
                            donationId,

                        requestedQuantity:
                            requestedQuantity,

                        message:
                            message
                    })
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            alert(
                data.message ||
                "Unable to request food."
            );

            return;
        }


        alert(
            "Food request submitted successfully!"
        );


        loadDonations();

    } catch (error) {

        console.error(error);

        alert(
            "Cannot connect to backend server."
        );
    }
}


// ==========================================
// COLLECTION HISTORY
// ==========================================

async function loadCollectionHistory() {

    const box =
        document.getElementById(
            "collectionHistory"
        );


    if (!box) {
        return;
    }


    box.innerHTML =
        "<p>Loading collection history...</p>";


    try {

        const res = await fetch(
            `${API_URL}/donations`
        );


        const donations =
            await res.json();


        if (!res.ok) {
            throw new Error();
        }


        const user = getUser();


        if (!user) {
            return;
        }


        const history =
            donations.filter((d) => {

                return (
                    d.status === "Completed" &&
                    d.collectedBy &&
                    d.collectedBy._id ===
                        getUserId()
                );

            });


        if (!history.length) {

            box.innerHTML = `
                <div class="donation-card">
                    <p>
                        You have not collected any food yet.
                    </p>
                </div>
            `;

            return;
        }


        box.innerHTML =
            history
                .map(
                    (d) => `

                        <article class="donation-card">

                            <h3>
                                ${escapeHtml(
                                    d.foodName
                                )}
                            </h3>

                            <p>
                                <b>Quantity:</b>
                                ${d.quantity}
                            </p>

                            <p>
                                <b>Location:</b>
                                ${escapeHtml(
                                    d.location
                                )}
                            </p>

                            <p>
                                <b>Donated by:</b>
                                ${escapeHtml(
                                    d.donor?.name ||
                                    "User"
                                )}
                            </p>

                            <p>
                                <b>Collected by:</b>
                                ${escapeHtml(
                                    d.collectedBy?.name ||
                                    "User"
                                )}
                            </p>

                            <p>
                                <b>Collected At:</b>
                                ${formatDate(
                                    d.collectedAt
                                )}
                            </p>

                            <span class="status">
                                Completed
                            </span>

                        </article>
                    `
                )
                .join("");


    } catch (error) {

        console.error(error);

        box.innerHTML = `
            <div class="donation-card">
                <p>
                    Unable to load collection history.
                </p>
            </div>
        `;
    }
}


// ==========================================
// GET CURRENT USER ID
// ==========================================

function getUserId() {

    const token = getToken();


    if (!token) {
        return null;
    }


    try {

        const payload =
            JSON.parse(
                atob(
                    token.split(".")[1]
                )
            );


        return payload.userId;

    } catch (error) {

        return null;
    }
}


// ==========================================
// FORMAT DATE
// ==========================================

function formatDate(date) {

    if (!date) {
        return "Not available";
    }


    return new Date(date).toLocaleString(
        "en-IN",
        {
            dateStyle: "medium",
            timeStyle: "short"
        }
    );
}


// ==========================================
// DASHBOARD DONATION COUNT
// ==========================================

async function loadCount() {

    try {

        const res = await fetch(
            `${API_URL}/donations`
        );


        const donations =
            await res.json();


        const count =
            Array.isArray(donations)
                ? donations.filter(
                    d =>
                        d.status ===
                        "Available"
                ).length
                : 0;


        const element =
            document.getElementById(
                "donationCount"
            );


        if (element) {
            element.textContent = count;
        }

    } catch (error) {

        console.error(error);
    }
}


// ==========================================
// NGO DASHBOARD
// ==========================================

async function loadNGODashboard() {

    const donationsBox =
        document.getElementById(
            "ngoDonationsList"
        );


    if (!donationsBox) {
        return;
    }


    try {

        const response =
            await fetch(
                `${API_URL}/donations`
            );


        const donations =
            await response.json();


        if (!response.ok) {
            throw new Error();
        }


        const available =
            donations.filter(
                donation =>
                    donation.status ===
                    "Available"
            );


        const availableCount =
            document.getElementById(
                "availableCount"
            );


        if (availableCount) {
            availableCount.textContent =
                available.length;
        }


        if (available.length === 0) {

            donationsBox.innerHTML = `
                <div class="donation-card">
                    <p>
                        No food donations are available right now.
                    </p>
                </div>
            `;

            loadRequestCount();

            return;
        }


        donationsBox.innerHTML =
            available
                .slice(0, 5)
                .map(
                    donation => `

                        <div class="donation-card">

                            <h3>
                                🍱
                                ${escapeHtml(
                                    donation.foodName
                                )}
                            </h3>

                            <p>
                                <b>Quantity:</b>
                                ${donation.quantity}
                            </p>

                            <p>
                                <b>Location:</b>
                                ${escapeHtml(
                                    donation.location
                                )}
                            </p>

                            <button
                                onclick="requestFood('${donation._id}')"
                            >
                                Request Food
                            </button>

                        </div>
                    `
                )
                .join("");


        loadRequestCount();

    } catch (error) {

        console.error(error);

        donationsBox.innerHTML = `
            <div class="donation-card">
                <p>
                    Unable to load available food.
                </p>
            </div>
        `;
    }
}


// ==========================================
// REQUEST COUNT
// ==========================================

async function loadRequestCount() {

    const requestCount =
        document.getElementById(
            "requestCount"
        );


    if (!requestCount) {
        return;
    }


    try {

        const response =
            await fetch(
                `${API_URL}/requests`,
                {
                    headers: {
                        Authorization:
                            `Bearer ${getToken()}`
                    }
                }
            );


        const requests =
            await response.json();


        if (!response.ok) {
            return;
        }


        requestCount.textContent =
            Array.isArray(requests)
                ? requests.length
                : 0;

    } catch (error) {

        console.error(error);
    }
}


// ==========================================
// ESCAPE HTML
// ==========================================

function escapeHtml(value) {

    return String(value).replace(
        /[&<>"']/g,
        (c) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[c])
    );
}


// ==========================================
// ADMIN PANEL
// ==========================================

async function loadAdminPanel() {

    const adminDonations =
        document.getElementById(
            "adminDonations"
        );


    if (!adminDonations) {
        return;
    }


    const token = getToken();


    if (!token) {

        window.location.href =
            "login.html";

        return;
    }


    try {

        const response =
            await fetch(
                `${API_URL}/donations`
            );


        const donations =
            await response.json();


        if (!response.ok) {

            throw new Error(
                "Unable to load donations"
            );
        }


        const total =
            donations.length;


        const available =
            donations.filter(
                donation =>
                    donation.status ===
                    "Available"
            ).length;


        const completed =
            donations.filter(
                donation =>
                    donation.status ===
                    "Completed"
            ).length;


        const totalElement =
            document.getElementById(
                "totalDonations"
            );


        const availableElement =
            document.getElementById(
                "availableDonations"
            );


        const collectedElement =
            document.getElementById(
                "collectedDonations"
            );


        if (totalElement) {
            totalElement.textContent =
                total;
        }


        if (availableElement) {
            availableElement.textContent =
                available;
        }


        if (collectedElement) {
            collectedElement.textContent =
                completed;
        }


        if (donations.length === 0) {

            adminDonations.innerHTML =
                "<p>No donations available.</p>";

            return;
        }


        adminDonations.innerHTML =
            donations
                .map(
                    (donation) => {

                        const donorName =
                            donation.donor?.name ||
                            "Unknown";


                        const donorEmail =
                            donation.donor?.email ||
                            "N/A";


                        return `

                            <div class="donation-card">

                                <h3>
                                    ${escapeHtml(
                                        donation.foodName
                                    )}
                                </h3>

                                <p>
                                    <strong>
                                        Quantity:
                                    </strong>
                                    ${donation.quantity}
                                </p>

                                <p>
                                    <strong>
                                        Location:
                                    </strong>
                                    ${escapeHtml(
                                        donation.location
                                    )}
                                </p>

                                <p>
                                    <strong>
                                        Description:
                                    </strong>
                                    ${escapeHtml(
                                        donation.description ||
                                        "No description"
                                    )}
                                </p>

                                <hr>

                                <p>
                                    <strong>
                                        Donor:
                                    </strong>
                                    ${escapeHtml(
                                        donorName
                                    )}
                                </p>

                                <p>
                                    <strong>
                                        Donor Email:
                                    </strong>
                                    ${escapeHtml(
                                        donorEmail
                                    )}
                                </p>

                                <p>
                                    <strong>
                                        Status:
                                    </strong>
                                    ${escapeHtml(
                                        donation.status
                                    )}
                                </p>

                                <button
                                    class="delete-btn"
                                    onclick="deleteDonation('${donation._id}')"
                                >
                                    Delete Donation
                                </button>

                            </div>
                        `;
                    }
                )
                .join("");

    } catch (error) {

        console.error(
            "Admin panel error:",
            error
        );


        adminDonations.innerHTML =
            "<p>Unable to load admin panel.</p>";
    }
}


// ==========================================
// DELETE DONATION
// ==========================================

async function deleteDonation(id) {

    const confirmDelete =
        confirm(
            "Are you sure you want to delete this donation?"
        );


    if (!confirmDelete) {
        return;
    }


    const token = getToken();


    if (!token) {

        alert(
            "Please login again."
        );

        window.location.href =
            "login.html";

        return;
    }


    try {

        const response =
            await fetch(
                `${API_URL}/donations/${id}`,
                {
                    method: "DELETE",

                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            alert(
                data.message ||
                "Delete failed"
            );

            return;
        }


        alert(
            "Donation deleted successfully"
        );


        loadAdminPanel();

    } catch (error) {

        console.error(error);

        alert(
            "Server error"
        );
    }
}


// ==========================================
// LOAD REQUESTS
// ==========================================

async function loadRequests() {

    const box =
        document.getElementById(
            "requestsList"
        );


    if (!box) {
        return;
    }


    const user = getUser();


    if (!user) {
        box.innerHTML =
            "<p>Please login again.</p>";
        return;
    }


    const token = getToken();


    if (!token) {
        box.innerHTML =
            "<p>Please login again.</p>";
        return;
    }


    box.innerHTML =
        "<p>Loading requests...</p>";


    try {

        console.log(
            "Loading requests for:",
            user
        );


        const response =
            await fetch(
                `${API_URL}/requests`,
                {
                    method: "GET",

                    headers: {
                        "Authorization":
                            `Bearer ${token}`,
                        "Content-Type":
                            "application/json"
                    }
                }
            );


        const requests =
            await response.json();


        console.log(
            "Requests received:",
            requests
        );


        if (!response.ok) {

            throw new Error(
                requests.message ||
                "Unable to load requests"
            );
        }


        if (
            !Array.isArray(requests) ||
            requests.length === 0
        ) {

            box.innerHTML = `
                <div class="donation-card">
                    <p>
                        No requests available.
                    </p>
                </div>
            `;

            return;
        }


        box.innerHTML =
            requests
                .map(
                    (request) => {

                        return `

                            <div class="donation-card">

                                <h3>
                                    🍱
                                    ${escapeHtml(
                                        request.donation?.foodName ||
                                        "Food Donation"
                                    )}
                                </h3>

                                <p>
                                    <b>
                                        Requested Quantity:
                                    </b>
                                    ${request.requestedQuantity}
                                </p>

                                <p>
                                    <b>
                                        Available Quantity:
                                    </b>
                                    ${request.donation?.quantity || 0}
                                </p>

                                <p>
                                    <b>
                                        Location:
                                    </b>
                                    ${escapeHtml(
                                        request.donation?.location ||
                                        "Not available"
                                    )}
                                </p>

                                <p>
                                    <b>
                                        NGO:
                                    </b>
                                    ${escapeHtml(
                                        request.ngo?.name ||
                                        "NGO"
                                    )}
                                </p>

                                <p>
                                    <b>
                                        NGO Email:
                                    </b>
                                    ${escapeHtml(
                                        request.ngo?.email ||
                                        "Not available"
                                    )}
                                </p>

                                <p>
                                    <b>
                                        Message:
                                    </b>
                                    ${escapeHtml(
                                        request.message ||
                                        "No message"
                                    )}
                                </p>

                                <p>
                                    <b>
                                        Status:
                                    </b>

                                    <span class="status">
                                        ${escapeHtml(
                                            request.status
                                        )}
                                    </span>
                                </p>

                                ${
                                    user.role === "donor" &&
                                    request.status === "Pending"

                                        ? `

                                            <button
                                                onclick="acceptRequest('${request._id}')"
                                            >
                                                Accept
                                            </button>

                                            <button
                                                onclick="rejectRequest('${request._id}')"
                                            >
                                                Reject
                                            </button>

                                        `

                                        : ""
                                }


                                ${
                                    user.role === "ngo" &&
                                    request.status === "Accepted"

                                        ? `

                                            <button
                                                onclick="completeRequest('${request._id}')"
                                            >
                                                Collect Food
                                            </button>

                                        `

                                        : ""
                                }

                            </div>

                        `;
                    }
                )
                .join("");

    } catch (error) {

        console.error(
            "Load requests error:",
            error
        );

        box.innerHTML = `
            <div class="donation-card">
                <p>
                    Unable to load requests.
                </p>

                <p>
                    ${escapeHtml(error.message)}
                </p>
            </div>
        `;
    }
}


// ==========================================
// ACCEPT REQUEST
// ==========================================

async function acceptRequest(id) {

    try {

        const response =
            await fetch(
                `${API_URL}/requests/${id}/accept`,
                {
                    method: "PATCH",

                    headers: {
                        Authorization:
                            `Bearer ${getToken()}`
                    }
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            alert(
                data.message ||
                "Unable to accept request."
            );

            return;
        }


        alert(
            "Request accepted successfully."
        );


        loadRequests();

    } catch (error) {

        console.error(error);

        alert(
            "Cannot connect to backend server."
        );
    }
}


// ==========================================
// REJECT REQUEST
// ==========================================

async function rejectRequest(id) {

    try {

        const response =
            await fetch(
                `${API_URL}/requests/${id}/reject`,
                {
                    method: "PATCH",

                    headers: {
                        Authorization:
                            `Bearer ${getToken()}`
                    }
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            alert(
                data.message ||
                "Unable to reject request."
            );

            return;
        }


        alert(
            "Request rejected."
        );


        loadRequests();

    } catch (error) {

        console.error(error);

        alert(
            "Cannot connect to backend server."
        );
    }
}


// ==========================================
// COMPLETE / COLLECT REQUEST
// ==========================================

async function completeRequest(id) {

    const confirmCollect =
        confirm(
            "Do you want to collect this food?"
        );


    if (!confirmCollect) {
        return;
    }


    try {

        const response =
            await fetch(
                `${API_URL}/requests/${id}/collect`,
                {
                    method: "PATCH",

                    headers: {
                        Authorization:
                            `Bearer ${getToken()}`
                    }
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            alert(
                data.message ||
                "Unable to collect food."
            );

            return;
        }


        alert(
            "Food collected successfully!"
        );


        loadRequests();

    } catch (error) {

        console.error(error);

        alert(
            "Cannot connect to backend server."
        );
    }
}