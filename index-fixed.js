const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const express = require("express");
require("dotenv").config();

// Initialize WhatsApp client with better error handling
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--no-first-run",
            "--no-zygote",
            "--single-process",
            "--disable-gpu"
        ]
    },
    restartOnAuthFail: true,
    qrMaxRetries: 5
});

// User session storage
const userSessions = new Map();

// Bot states
const BOT_STATES = {
    WELCOME: "welcome",
    PRIVACY_POLICY: "privacy_policy",
    COLLECT_NAME: "collect_name",
    COLLECT_PHONE: "collect_phone",
    MAILING_LIST: "mailing_list",
    SELECT_CATEGORY: "select_category",
    CURRENT_PROVIDER: "current_provider",
    CUSTOMIZE_PACKAGE: "customize_package",
    DISPLAY_PACKAGES: "display_packages",
    SELECT_COMPANIES: "select_companies",
    ADDITIONAL_CATEGORIES: "additional_categories",
    CUSTOMER_SUPPORT: "customer_support",
    SUPPORT_CATEGORY: "support_category",
    SUPPORT_COMPANY: "support_company",
    SUPPORT_TYPE: "support_type",
    OPTIONAL_CHECKS: "optional_checks"
};

// Package data
const PACKAGES = {
    internet: [
        { name: "??????? ????", price: "79", company: "?????" },
        { name: "??????? ?????", price: "99", company: "???" },
        { name: "??????? ???", price: "85", company: "?????" }
    ],
    mobile: [
        { name: "????? ?????", price: "29", company: "?????" },
        { name: "????? ????", price: "25", company: "?????" },
        { name: "????? ???????", price: "59", company: "???" }
    ],
    tv: [
        { name: "????? ????", price: "69", company: "???" },
        { name: "????? ?????", price: "99", company: "?????" },
        { name: "????? ???????", price: "129", company: "?????" }
    ],
    triple: [
        { name: "????? ?????", price: "149", company: "???" },
        { name: "????? ?????", price: "179", company: "?????" },
        { name: "????? ???????", price: "199", company: "?????" }
    ],
    water: [
        { name: "???????", price: "39", company: "?? ???" },
        { name: "???", price: "49", company: "??????" },
        { name: "?? ????", price: "59", company: "??????" }
    ],
    electricity: [
        { name: "???? ?????", price: "0", company: "???? ????" },
        { name: "???? ????? ???????", price: "0", company: "???? ????" }
    ]
};

// Initialize user session
function initUserSession(phoneNumber) {
    if (!userSessions.has(phoneNumber)) {
        userSessions.set(phoneNumber, {
            state: BOT_STATES.WELCOME,
            data: {},
            currentCategory: null,
            selectedPackages: [],
            additionalCategories: []
        });
    }
    return userSessions.get(phoneNumber);
}

// Get category options
function getCategoryOptions() {
    return `?? ????? ???? ????? ?? ???????? ??? ???? ?? ???? ?? ????:

1?? ?? ???????
2?? ?? ?????
3?? ?? ????????
4?? ??? ?????
5?? ?? ??? ???
6?? ? ????
7?? ?? ????`;
}

// Get package options for category
function getPackageOptions(category) {
    const packages = PACKAGES[category] || [];
    let options = `?? ????? ???? ????? ??????? ??. ??? ???? ???? ????? ??? ??????????, ?? "???? ?? ???" ?? ?? ????. ????? ???? ?? ??????? ????????.

??????? (???? "??? ?-")
${getCategoryName(category)} ${getCategoryEmoji(category)}`;

    packages.forEach((pkg, index) => {
        options += `\n${index + 1}?? ${pkg.name} – ??? ?-${pkg.price} ?`;
    });
    
    options += `\n${packages.length + 1}?? ?? ???? ?? ???\n ?? ????`;
    
    return options;
}

// Get category name
function getCategoryName(category) {
    const names = {
        internet: "???????",
        mobile: "?????",
        tv: "????????",
        triple: "?????",
        water: "??? ???",
        electricity: "????"
    };
    return names[category] || category;
}

// Get category emoji
function getCategoryEmoji(category) {
    const emojis = {
        internet: "??",
        mobile: "??",
        tv: "??",
        triple: "???",
        water: "??",
        electricity: "?"
    };
    return emojis[category] || "??";
}

// Process message
async function processMessage(message) {
    const phoneNumber = message.from;
    const userSession = initUserSession(phoneNumber);
    const messageText = message.body.trim();
    
    console.log(`Processing message from ${phoneNumber}: ${messageText} (State: ${userSession.state})`);
    
    // Handle back button
    if (messageText.includes("??") || messageText.includes("????")) {
        await handleBackButton(phoneNumber, userSession);
        return;
    }
    
    switch (userSession.state) {
        case BOT_STATES.WELCOME:
            await handleWelcome(phoneNumber, userSession, messageText);
            break;
        case BOT_STATES.PRIVACY_POLICY:
            await handlePrivacyPolicy(phoneNumber, userSession, messageText);
            break;
        case BOT_STATES.COLLECT_NAME:
            await handleCollectName(phoneNumber, userSession, messageText);
            break;
        case BOT_STATES.COLLECT_PHONE:
            await handleCollectPhone(phoneNumber, userSession, messageText);
            break;
        case BOT_STATES.MAILING_LIST:
            await handleMailingList(phoneNumber, userSession, messageText);
            break;
        case BOT_STATES.SELECT_CATEGORY:
            await handleSelectCategory(phoneNumber, userSession, messageText);
            break;
        case BOT_STATES.CURRENT_PROVIDER:
            await handleCurrentProvider(phoneNumber, userSession, messageText);
            break;
        case BOT_STATES.CUSTOMIZE_PACKAGE:
            await handleCustomizePackage(phoneNumber, userSession, messageText);
            break;
        case BOT_STATES.DISPLAY_PACKAGES:
            await handleDisplayPackages(phoneNumber, userSession, messageText);
            break;
        case BOT_STATES.SELECT_COMPANIES:
            await handleSelectCompanies(phoneNumber, userSession, messageText);
            break;
        case BOT_STATES.ADDITIONAL_CATEGORIES:
            await handleAdditionalCategories(phoneNumber, userSession, messageText);
            break;
        case BOT_STATES.CUSTOMER_SUPPORT:
            await handleCustomerSupport(phoneNumber, userSession, messageText);
            break;
        case BOT_STATES.SUPPORT_CATEGORY:
            await handleSupportCategory(phoneNumber, userSession, messageText);
            break;
        case BOT_STATES.SUPPORT_COMPANY:
            await handleSupportCompany(phoneNumber, userSession, messageText);
            break;
        case BOT_STATES.SUPPORT_TYPE:
            await handleSupportType(phoneNumber, userSession, messageText);
            break;
        case BOT_STATES.OPTIONAL_CHECKS:
            await handleOptionalChecks(phoneNumber, userSession, messageText);
            break;
    }
}

// Handle welcome
async function handleWelcome(phoneNumber, userSession, messageText) {
    const welcomeMessage = `?? ????! ???? ??? ?-LoroBot! ??? ???? ????? ?????? ????? ?????? ?????? ???? ??? ???????? + ??????? ???? ?? ?????? ??????? ????.

?? ??? ??? ?? ??????? ??????? ???? ???: [????? ???????? ??????] ???? ?? ?????? ??? ??????.

? ?? ?????
? ?? ?? ?????`;
    
    await client.sendMessage(phoneNumber, welcomeMessage);
    userSession.state = BOT_STATES.PRIVACY_POLICY;
}

// Handle privacy policy
async function handlePrivacyPolicy(phoneNumber, userSession, messageText) {
    if (messageText.includes("?????") || messageText.includes("??") || messageText.includes("??")) {
        const nameMessage = `?? ?? ??? ???? ???? ????? ???? ????? ???? ????? ??????.`;
        await client.sendMessage(phoneNumber, nameMessage);
        userSession.state = BOT_STATES.COLLECT_NAME;
    } else if (messageText.includes("??") || messageText.includes("??")) {
        const declineMessage = `?? ?? ???? ?????? ??? ?????. ???? "??" ?????? ????.`;
        await client.sendMessage(phoneNumber, declineMessage);
    } else {
        const invalidMessage = `? ??? ??? ?????? ????:
? ?? ?????
? ?? ?? ?????`;
        await client.sendMessage(phoneNumber, invalidMessage);
    }
}

// Handle collect name
async function handleCollectName(phoneNumber, userSession, messageText) {
    if (messageText.length < 2) {
        const invalidMessage = `? ??? ???? ?? ???? (????? 2 ?????).`;
        await client.sendMessage(phoneNumber, invalidMessage);
        return;
    }
    
    userSession.data.name = messageText;
    const phoneMessage = `?? ??? ?????? ??? ?????? ???? ?? ????, ????? ???? ?????.`;
    await client.sendMessage(phoneNumber, phoneMessage);
    userSession.state = BOT_STATES.COLLECT_PHONE;
}

// Handle collect phone
async function handleCollectPhone(phoneNumber, userSession, messageText) {
    // Basic phone validation
    const phoneRegex = /^[\d\-\+\(\)\s]+$/;
    if (!phoneRegex.test(messageText) || messageText.length < 8) {
        const invalidMessage = `? ??? ???? ???? ????? ????.`;
        await client.sendMessage(phoneNumber, invalidMessage);
        return;
    }
    
    userSession.data.phone = messageText;
    const mailingMessage = `?? ???? ???? ??????? ?? ?????? ????? ?? ???? ????? ?????? ???? ?? ?????? ?????? ?????? ???????!

1?? ?? ??
2?? ?? ??
3?? ?? ????`;
    
    await client.sendMessage(phoneNumber, mailingMessage);
    userSession.state = BOT_STATES.MAILING_LIST;
}

// Handle mailing list
async function handleMailingList(phoneNumber, userSession, messageText) {
    if (messageText.includes("1") || messageText.includes("??") || messageText.includes("??")) {
        userSession.data.mailingList = true;
    } else if (messageText.includes("2") || messageText.includes("??") || messageText.includes("??")) {
        userSession.data.mailingList = false;
    } else {
        const invalidMessage = `? ??? ??? ?????? ????:
1?? ?? ??
2?? ?? ??
3?? ?? ????`;
        await client.sendMessage(phoneNumber, invalidMessage);
        return;
    }
    
    const categoryMessage = getCategoryOptions();
    await client.sendMessage(phoneNumber, categoryMessage);
    userSession.state = BOT_STATES.SELECT_CATEGORY;
}

// Handle select category
async function handleSelectCategory(phoneNumber, userSession, messageText) {
    let category = null;
    
    if (messageText.includes("1") || messageText.includes("???????")) {
        category = "internet";
    } else if (messageText.includes("2") || messageText.includes("?????")) {
        category = "mobile";
    } else if (messageText.includes("3") || messageText.includes("????????")) {
        category = "tv";
    } else if (messageText.includes("4") || messageText.includes("?????")) {
        category = "triple";
    } else if (messageText.includes("5") || messageText.includes("??? ???")) {
        category = "water";
    } else if (messageText.includes("6") || messageText.includes("????")) {
        category = "electricity";
    } else {
        const invalidMessage = `? ??? ??? ?????? ????:\n${getCategoryOptions()}`;
        await client.sendMessage(phoneNumber, invalidMessage);
        return;
    }
    
    userSession.currentCategory = category;
    const providerMessage = `?? ????? ???? ??? ????? ?? ?? ???? ?????? ???.`;
    await client.sendMessage(phoneNumber, providerMessage);
    userSession.state = BOT_STATES.CURRENT_PROVIDER;
}

// Handle current provider
async function handleCurrentProvider(phoneNumber, userSession, messageText) {
    if (messageText.length < 2) {
        const invalidMessage = `? ??? ???? ?? ???? ????.`;
        await client.sendMessage(phoneNumber, invalidMessage);
        return;
    }
    
    userSession.data.currentProvider = messageText;
    const packageMessage = getPackageOptions(userSession.currentCategory);
    await client.sendMessage(phoneNumber, packageMessage);
    userSession.state = BOT_STATES.CUSTOMIZE_PACKAGE;
}

// Handle customize package
async function handleCustomizePackage(phoneNumber, userSession, messageText) {
    const packages = PACKAGES[userSession.currentCategory] || [];
    let selectedPackage = null;
    
    if (messageText.includes("??") || messageText.includes("????")) {
        // AI recommendation - select first package
        selectedPackage = packages[0];
    } else {
        const packageNumber = parseInt(messageText);
        if (packageNumber >= 1 && packageNumber <= packages.length) {
            selectedPackage = packages[packageNumber - 1];
        } else {
            const invalidMessage = `? ??? ??? ?????? ????:\n${getPackageOptions(userSession.currentCategory)}`;
            await client.sendMessage(phoneNumber, invalidMessage);
            return;
        }
    }
    
    userSession.selectedPackages.push({
        category: userSession.currentCategory,
        package: selectedPackage
    });
    
    // Display top packages
    await displayTopPackages(phoneNumber, userSession);
}

// Display top packages
async function displayTopPackages(phoneNumber, userSession) {
    const packages = PACKAGES[userSession.currentCategory] || [];
    let message = `?? ??????? ???????? ????? ?????? ?????:`;
    
    packages.slice(0, 5).forEach((pkg, index) => {
        message += `\n${index + 1}?? ${pkg.company} – ??? ?-${pkg.price} ?`;
    });
    
    await client.sendMessage(phoneNumber, message);
    
    const companiesMessage = `?? ??? ????? ?? ?????? ???? ???? ????? ?? ?? ??????, ???? ???????, ?? ????? ????? ?? ?????? ???????.

1?? ????? (?????)
2?? ????? ???????
3?? ????? ?????? (?? ?????)
4?? ?? ????`;
    
    await client.sendMessage(phoneNumber, companiesMessage);
    userSession.state = BOT_STATES.SELECT_COMPANIES;
}

// Handle select companies
async function handleSelectCompanies(phoneNumber, userSession, messageText) {
    if (messageText.includes("1") || messageText.includes("?????")) {
        userSession.data.selectedCompanies = "all";
    } else if (messageText.includes("2") || messageText.includes("???????")) {
        const specificMessage = `?? ???? ???? ????????`;
        await client.sendMessage(phoneNumber, specificMessage);
        userSession.state = BOT_STATES.SELECT_COMPANIES;
        return;
    } else if (messageText.includes("3") || messageText.includes("?????")) {
        const freeTextMessage = `?? ???? ?? ???? ?????? (??????? ?????):`;
        await client.sendMessage(phoneNumber, freeTextMessage);
        userSession.state = BOT_STATES.SELECT_COMPANIES;
        return;
    } else {
        // Handle specific company names or free text
        userSession.data.selectedCompanies = messageText;
    }
    
    const additionalMessage = `?? ???? ?????? ?? ??????? ???????

?? / ?? / ?? ????`;
    
    await client.sendMessage(phoneNumber, additionalMessage);
    userSession.state = BOT_STATES.ADDITIONAL_CATEGORIES;
}

// Handle additional categories
async function handleAdditionalCategories(phoneNumber, userSession, messageText) {
    if (messageText.includes("??") || messageText.includes("??")) {
        const categoryMessage = getCategoryOptions();
        await client.sendMessage(phoneNumber, categoryMessage);
        userSession.state = BOT_STATES.SELECT_CATEGORY;
    } else if (messageText.includes("??")) {
        const supportMessage = `??? ???? ????? ???????

?? / ?? / ?? ????`;
        await client.sendMessage(phoneNumber, supportMessage);
        userSession.state = BOT_STATES.CUSTOMER_SUPPORT;
    } else {
        const invalidMessage = `? ??? ??? ?????? ????:
?? / ?? / ?? ????`;
        await client.sendMessage(phoneNumber, invalidMessage);
    }
}

// Handle customer support
async function handleCustomerSupport(phoneNumber, userSession, messageText) {
    if (messageText.includes("??")) {
        const categoryMessage = getCategoryOptions();
        await client.sendMessage(phoneNumber, categoryMessage);
        userSession.state = BOT_STATES.SUPPORT_CATEGORY;
    } else if (messageText.includes("??")) {
        await showOptionalChecks(phoneNumber, userSession);
    } else {
        const invalidMessage = `? ??? ??? ?????? ????:
?? / ?? / ?? ????`;
        await client.sendMessage(phoneNumber, invalidMessage);
    }
}

// Handle support category
async function handleSupportCategory(phoneNumber, userSession, messageText) {
    let category = null;
    
    if (messageText.includes("1") || messageText.includes("???????")) {
        category = "internet";
    } else if (messageText.includes("2") || messageText.includes("?????")) {
        category = "mobile";
    } else if (messageText.includes("3") || messageText.includes("????????")) {
        category = "tv";
    } else if (messageText.includes("4") || messageText.includes("?????")) {
        category = "triple";
    } else if (messageText.includes("5") || messageText.includes("??? ???")) {
        category = "water";
    } else if (messageText.includes("6") || messageText.includes("????")) {
        category = "electricity";
    } else {
        const invalidMessage = `? ??? ??? ?????? ????:\n${getCategoryOptions()}`;
        await client.sendMessage(phoneNumber, invalidMessage);
        return;
    }
    
    userSession.data.supportCategory = category;
    const companyMessage = `?? ????? ???? ??? ?????`;
    await client.sendMessage(phoneNumber, companyMessage);
    userSession.state = BOT_STATES.SUPPORT_COMPANY;
}

// Handle support company
async function handleSupportCompany(phoneNumber, userSession, messageText) {
    if (messageText.length < 2) {
        const invalidMessage = `? ??? ???? ?? ???? ????.`;
        await client.sendMessage(phoneNumber, invalidMessage);
        return;
    }
    
    userSession.data.supportCompany = messageText;
    const supportTypeMessage = `?? ???? ????? ??? ?????

1?? ????? ???? – ???? ???? ????? ??????
2?? ??????? – ???? ????? + ???? ?? ???? ???? ????? ?????? ?????
3?? ?? ????`;
    
    await client.sendMessage(phoneNumber, supportTypeMessage);
    userSession.state = BOT_STATES.SUPPORT_TYPE;
}

// Handle support type
async function handleSupportType(phoneNumber, userSession, messageText) {
    if (messageText.includes("1") || messageText.includes("????")) {
        const techSupportMessage = `??? ????? ?????? ????:
?? ?????: 1-800-XXX-XXX
?? ??????: support@company.com
?? ???: www.company.com/support`;
        await client.sendMessage(phoneNumber, techSupportMessage);
    } else if (messageText.includes("2") || messageText.includes("???????")) {
        const cancellationMessage = `?? ????? ????????: www.company.com/cancel
        
???? ???? ????? ?????? ??????`;
        await client.sendMessage(phoneNumber, cancellationMessage);
        // Return to package selection
        userSession.state = BOT_STATES.SELECT_CATEGORY;
        return;
    } else {
        const invalidMessage = `? ??? ??? ?????? ????:
1?? ????? ????
2?? ???????
3?? ?? ????`;
        await client.sendMessage(phoneNumber, invalidMessage);
        return;
    }
    
    await showOptionalChecks(phoneNumber, userSession);
}

// Show optional checks
async function showOptionalChecks(phoneNumber, userSession) {
    const checksMessage = `?? ???? ???? ?????? ???????

?? ????? ?????? ?????: [?????]
?? ????? ????? ??? ?????: [?????]
?? ????? ????? ???????: [?????]

???? ??????? ?-LoroBot! ??`;
    
    await client.sendMessage(phoneNumber, checksMessage);
    userSession.state = BOT_STATES.OPTIONAL_CHECKS;
}

// Handle optional checks
async function handleOptionalChecks(phoneNumber, userSession, messageText) {
    // End of conversation - reset session
    userSessions.delete(phoneNumber);
    const endMessage = `?? ???? ??????? ?-LoroBot! ?? ???? ?????? ????, ???? ??? ?????.`;
    await client.sendMessage(phoneNumber, endMessage);
}

// Handle back button
async function handleBackButton(phoneNumber, userSession) {
    // Simple back navigation - go to previous state
    switch (userSession.state) {
        case BOT_STATES.PRIVACY_POLICY:
            userSession.state = BOT_STATES.WELCOME;
            await handleWelcome(phoneNumber, userSession, "");
            break;
        case BOT_STATES.COLLECT_NAME:
            userSession.state = BOT_STATES.PRIVACY_POLICY;
            await handlePrivacyPolicy(phoneNumber, userSession, "");
            break;
        case BOT_STATES.COLLECT_PHONE:
            userSession.state = BOT_STATES.COLLECT_NAME;
            await handleCollectName(phoneNumber, userSession, "");
            break;
        case BOT_STATES.MAILING_LIST:
            userSession.state = BOT_STATES.COLLECT_PHONE;
            await handleCollectPhone(phoneNumber, userSession, "");
            break;
        case BOT_STATES.SELECT_CATEGORY:
            userSession.state = BOT_STATES.MAILING_LIST;
            await handleMailingList(phoneNumber, userSession, "");
            break;
        default:
            const backMessage = `?? ???? ???? ?????...`;
            await client.sendMessage(phoneNumber, backMessage);
    }
}

// Event handlers with better error handling
client.on("qr", (qr) => {
    console.log("QR Code generated. Scan with WhatsApp:");
    qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
    console.log("LoroBot is ready! ??");
});

client.on("authenticated", () => {
    console.log("WhatsApp authenticated successfully!");
});

client.on("auth_failure", (msg) => {
    console.error("Authentication failed:", msg);
});

client.on("disconnected", (reason) => {
    console.log("WhatsApp disconnected:", reason);
});

client.on("message", async (message) => {
    if (message.from === "status@broadcast") return;
    
    try {
        await processMessage(message);
    } catch (error) {
        console.error("Error processing message:", error);
        try {
            await client.sendMessage(message.from, "? ????? ?????. ??? ??? ???.");
        } catch (sendError) {
            console.error("Error sending error message:", sendError);
        }
    }
});

// Initialize the client with error handling
client.initialize().catch(error => {
    console.error("Failed to initialize WhatsApp client:", error);
    console.log("Retrying in 5 seconds...");
    setTimeout(() => {
        client.initialize().catch(err => {
            console.error("Retry failed:", err);
        });
    }, 5000);
});

// Express server for health check
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.json({ status: "LoroBot is running!", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

console.log("Starting LoroBot...");
console.log("Scan the QR code with your WhatsApp to connect the bot.");
