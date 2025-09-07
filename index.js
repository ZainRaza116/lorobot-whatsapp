const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const express = require("express");
require("dotenv").config();

// Initialize WhatsApp client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
    }
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
        { name: "אינטרנט ביתי", price: "79", company: "פרטנר" },
        { name: "אינטרנט סיבים", price: "99", company: "הוט" },
        { name: "אינטרנט כשר", price: "85", company: "סלקום" }
    ],
    mobile: [
        { name: "חבילה רגילה", price: "29", company: "פרטנר" },
        { name: "חבילה כשרה", price: "25", company: "סלקום" },
        { name: "חבילה משפחתית", price: "59", company: "הוט" }
    ],
    tv: [
        { name: "חבילת בסיס", price: "69", company: "הוט" },
        { name: "חבילת ספורט", price: "99", company: "פרטנר" },
        { name: "חבילת פרימיום", price: "129", company: "סלקום" }
    ],
    triple: [
        { name: "טריפל בסיסי", price: "149", company: "הוט" },
        { name: "טריפל ספורט", price: "179", company: "פרטנר" },
        { name: "טריפל פרימיום", price: "199", company: "סלקום" }
    ],
    water: [
        { name: "סטנדרטי", price: "39", company: "מי עדן" },
        { name: "כשר", price: "49", company: "נביעות" },
        { name: "עם סודה", price: "59", company: "נביעות" }
    ],
    electricity: [
        { name: "הנחה קבועה", price: "0", company: "חברת חשמל" },
        { name: "הנחה בשעות מסוימות", price: "0", company: "חברת חשמל" }
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
    return `📊 באיזה תחום נתחיל את ההשוואה? בחר מספר או כתוב שם תחום:

1️⃣ 🌐 אינטרנט
2️⃣ 📱 סלולר
3️⃣ 📺 טלוויזיה
4️⃣ 🎛️ טריפל
5️⃣ 💧 ברי מים
6️⃣ ⚡ חשמל
7️⃣ ↩️ חזרה`;
}

// Get package options for category
function getPackageOptions(category) {
    const packages = PACKAGES[category] || [];
    let options = `💡 עכשיו נבחר חבילה שמתאימה לך. לכל תחום תוכל לבחור אחת מהאפשרויות, או "תציע לי אתה" אם לא בטוח. בסיום תראה את החבילות המובילות.

דוגמאות (כולל "החל מ-")
${getCategoryName(category)} ${getCategoryEmoji(category)}`;

    packages.forEach((pkg, index) => {
        options += `\n${index + 1}️⃣ ${pkg.name} – החל מ-${pkg.price} ₪`;
    });
    
    options += `\n${packages.length + 1}️⃣ 🤖 תציע לי אתה\n ↩️ חזרה`;
    
    return options;
}

// Get category name
function getCategoryName(category) {
    const names = {
        internet: "אינטרנט",
        mobile: "סלולר",
        tv: "טלוויזיה",
        triple: "טריפל",
        water: "ברי מים",
        electricity: "חשמל"
    };
    return names[category] || category;
}

// Get category emoji
function getCategoryEmoji(category) {
    const emojis = {
        internet: "🌐",
        mobile: "📱",
        tv: "📺",
        triple: "🎛️",
        water: "💧",
        electricity: "⚡"
    };
    return emojis[category] || "📦";
}

// Get category by number
function getCategoryByNumber(number) {
    const categories = ["internet", "mobile", "tv", "triple", "water", "electricity"];
    return categories[number - 1];
}

// Process message
async function processMessage(message) {
    const phoneNumber = message.from;
    const userSession = initUserSession(phoneNumber);
    const messageText = message.body.trim();
    
    console.log(`Processing message from ${phoneNumber}: ${messageText} (State: ${userSession.state})`);
    
    // Handle back button
    if (messageText.includes("↩️") || messageText.includes("חזרה")) {
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
    const welcomeMessage = `👋 שלום! ברוך הבא ל-LoroBot! אני הבוט היחיד בישראל שמציע השוואת מחירים בזמן אמת בוואטסאפ + עדכונים חמים על מבצעים וירידות מחיר.

📄 אנא קרא את מדיניות הפרטיות שלנו כאן: [קישור למדיניות פרטיות] ואשר את התנאים כדי להמשיך.

✅ 👍 מסכים
❌ 🙈 לא מסכים`;
    
    await client.sendMessage(phoneNumber, welcomeMessage);
    userSession.state = BOT_STATES.PRIVACY_POLICY;
}

// Handle privacy policy
async function handlePrivacyPolicy(phoneNumber, userSession, messageText) {
    if (messageText.includes("מסכים") || messageText.includes("כן") || messageText.includes("👍")) {
        const nameMessage = `📝 מה השם שלך? נשמח לפנות אליך באופן אישי במהלך השימוש.`;
        await client.sendMessage(phoneNumber, nameMessage);
        userSession.state = BOT_STATES.COLLECT_NAME;
    } else if (messageText.includes("לא") || messageText.includes("🙈")) {
        const declineMessage = `😅 לא ניתן להמשיך בלי אישור. כתוב "כן" כשתרצה לאשר.`;
        await client.sendMessage(phoneNumber, declineMessage);
    } else {
        const invalidMessage = `❌ אנא בחר אפשרות תקפה:
✅ 👍 מסכים
❌ 🙈 לא מסכים`;
        await client.sendMessage(phoneNumber, invalidMessage);
    }
}

// Handle collect name
async function handleCollectName(phoneNumber, userSession, messageText) {
    if (messageText.length < 2) {
        const invalidMessage = `❌ אנא הכנס שם תקין (לפחות 2 תווים).`;
        await client.sendMessage(phoneNumber, invalidMessage);
        return;
    }
    
    userSession.data.name = messageText;
    const phoneMessage = `📞 ומה הטלפון שלך ליצירת קשר? אל דאגה, נשמור עליו פרטית.`;
    await client.sendMessage(phoneNumber, phoneMessage);
    userSession.state = BOT_STATES.COLLECT_PHONE;
}

// Handle collect phone
async function handleCollectPhone(phoneNumber, userSession, messageText) {
    // Basic phone validation
    const phoneRegex = /^[\d\-\+\(\)\s]+$/;
    if (!phoneRegex.test(messageText) || messageText.length < 8) {
        const invalidMessage = `❌ אנא הכנס מספר טלפון תקין.`;
        await client.sendMessage(phoneNumber, invalidMessage);
        return;
    }
    
    userSession.data.phone = messageText;
    const mailingMessage = `📩 רוצה לקבל עדכונים על מבצעים חמים? כך תוכל להיות הראשון לדעת על ירידות מחירים והטבות בלעדיות!

1️⃣ 👍 כן
2️⃣ 👎 לא
3️⃣ ↩️ חזרה`;
    
    await client.sendMessage(phoneNumber, mailingMessage);
    userSession.state = BOT_STATES.MAILING_LIST;
}

// Handle mailing list
async function handleMailingList(phoneNumber, userSession, messageText) {
    if (messageText.includes("1") || messageText.includes("כן") || messageText.includes("👍")) {
        userSession.data.mailingList = true;
    } else if (messageText.includes("2") || messageText.includes("לא") || messageText.includes("👎")) {
        userSession.data.mailingList = false;
    } else {
        const invalidMessage = `❌ אנא בחר אפשרות תקפה:
1️⃣ 👍 כן
2️⃣ 👎 לא
3️⃣ ↩️ חזרה`;
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
    
    if (messageText.includes("1") || messageText.includes("אינטרנט")) {
        category = "internet";
    } else if (messageText.includes("2") || messageText.includes("סלולר")) {
        category = "mobile";
    } else if (messageText.includes("3") || messageText.includes("טלוויזיה")) {
        category = "tv";
    } else if (messageText.includes("4") || messageText.includes("טריפל")) {
        category = "triple";
    } else if (messageText.includes("5") || messageText.includes("ברי מים")) {
        category = "water";
    } else if (messageText.includes("6") || messageText.includes("חשמל")) {
        category = "electricity";
    } else {
        const invalidMessage = `❌ אנא בחר אפשרות תקפה:\n${getCategoryOptions()}`;
        await client.sendMessage(phoneNumber, invalidMessage);
        return;
    }
    
    userSession.currentCategory = category;
    const providerMessage = `�� באיזו חברה אתה כרגע? כך לא נציע חבילות שלה.`;
    await client.sendMessage(phoneNumber, providerMessage);
    userSession.state = BOT_STATES.CURRENT_PROVIDER;
}

// Handle current provider
async function handleCurrentProvider(phoneNumber, userSession, messageText) {
    if (messageText.length < 2) {
        const invalidMessage = `❌ אנא הכנס שם חברה תקין.`;
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
    
    if (messageText.includes("🤖") || messageText.includes("תציע")) {
        // AI recommendation - select first package
        selectedPackage = packages[0];
    } else {
        const packageNumber = parseInt(messageText);
        if (packageNumber >= 1 && packageNumber <= packages.length) {
            selectedPackage = packages[packageNumber - 1];
        } else {
            const invalidMessage = `❌ אנא בחר אפשרות תקפה:\n${getPackageOptions(userSession.currentCategory)}`;
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
    let message = `🔥 החבילות המובילות עבורך מהתחום שבחרת:`;
    
    packages.slice(0, 5).forEach((pkg, index) => {
        message += `\n${index + 1}️⃣ ${pkg.company} – החל מ-${pkg.price} ₪`;
    });
    
    await client.sendMessage(phoneNumber, message);
    
    const companiesMessage = `💡 למי לשלוח את הפרטים שלך? תוכל לבחור את כל החברות, חברה ספציפית, או לכתוב ידנית את החברות הרצויות.

1️⃣ לכולם (מומלץ)
2️⃣ לחברה ספציפית
3️⃣ כתיבה חופשית (שם חברות)
4️⃣ ↩️ חזרה`;
    
    await client.sendMessage(phoneNumber, companiesMessage);
    userSession.state = BOT_STATES.SELECT_COMPANIES;
}

// Handle select companies
async function handleSelectCompanies(phoneNumber, userSession, messageText) {
    if (messageText.includes("1") || messageText.includes("לכולם")) {
        userSession.data.selectedCompanies = "all";
    } else if (messageText.includes("2") || messageText.includes("ספציפית")) {
        const specificMessage = `🏢 איזו חברה ספציפית?`;
        await client.sendMessage(phoneNumber, specificMessage);
        userSession.state = BOT_STATES.SELECT_COMPANIES;
        return;
    } else if (messageText.includes("3") || messageText.includes("כתיבה")) {
        const freeTextMessage = `✍️ כתוב את שמות החברות (מופרדות בפסיק):`;
        await client.sendMessage(phoneNumber, freeTextMessage);
        userSession.state = BOT_STATES.SELECT_COMPANIES;
        return;
    } else {
        // Handle specific company names or free text
        userSession.data.selectedCompanies = messageText;
    }
    
    const additionalMessage = `🔄 רוצה להשוות גם בתחומים נוספים?

כן / לא / ↩️ חזרה`;
    
    await client.sendMessage(phoneNumber, additionalMessage);
    userSession.state = BOT_STATES.ADDITIONAL_CATEGORIES;
}

// Handle additional categories
async function handleAdditionalCategories(phoneNumber, userSession, messageText) {
    if (messageText.includes("כן") || messageText.includes("כן")) {
        const categoryMessage = getCategoryOptions();
        await client.sendMessage(phoneNumber, categoryMessage);
        userSession.state = BOT_STATES.SELECT_CATEGORY;
    } else if (messageText.includes("לא")) {
        const supportMessage = `🛠️ רוצה שירות לקוחות?

כן / לא / ↩️ חזרה`;
        await client.sendMessage(phoneNumber, supportMessage);
        userSession.state = BOT_STATES.CUSTOMER_SUPPORT;
    } else {
        const invalidMessage = `❌ אנא בחר אפשרות תקפה:
כן / לא / ↩️ חזרה`;
        await client.sendMessage(phoneNumber, invalidMessage);
    }
}

// Handle customer support
async function handleCustomerSupport(phoneNumber, userSession, messageText) {
    if (messageText.includes("כן")) {
        const categoryMessage = getCategoryOptions();
        await client.sendMessage(phoneNumber, categoryMessage);
        userSession.state = BOT_STATES.SUPPORT_CATEGORY;
    } else if (messageText.includes("לא")) {
        await showOptionalChecks(phoneNumber, userSession);
    } else {
        const invalidMessage = `❌ אנא בחר אפשרות תקפה:
כן / לא / ↩️ חזרה`;
        await client.sendMessage(phoneNumber, invalidMessage);
    }
}

// Handle support category
async function handleSupportCategory(phoneNumber, userSession, messageText) {
    let category = null;
    
    if (messageText.includes("1") || messageText.includes("אינטרנט")) {
        category = "internet";
    } else if (messageText.includes("2") || messageText.includes("סלולר")) {
        category = "mobile";
    } else if (messageText.includes("3") || messageText.includes("טלוויזיה")) {
        category = "tv";
    } else if (messageText.includes("4") || messageText.includes("טריפל")) {
        category = "triple";
    } else if (messageText.includes("5") || messageText.includes("ברי מים")) {
        category = "water";
    } else if (messageText.includes("6") || messageText.includes("חשמל")) {
        category = "electricity";
    } else {
        const invalidMessage = `❌ אנא בחר אפשרות תקפה:\n${getCategoryOptions()}`;
        await client.sendMessage(phoneNumber, invalidMessage);
        return;
    }
    
    userSession.data.supportCategory = category;
    const companyMessage = `🏢 באיזו חברה אתה נמצא?`;
    await client.sendMessage(phoneNumber, companyMessage);
    userSession.state = BOT_STATES.SUPPORT_COMPANY;
}

// Handle support company
async function handleSupportCompany(phoneNumber, userSession, messageText) {
    if (messageText.length < 2) {
        const invalidMessage = `❌ אנא הכנס שם חברה תקין.`;
        await client.sendMessage(phoneNumber, invalidMessage);
        return;
    }
    
    userSession.data.supportCompany = messageText;
    const supportTypeMessage = `⚙️ איזה שירות אתה רוצה?

1️⃣ שירות טכני – מציג פרטי שירות לקוחות
2️⃣ התנתקות – נותן קישור + שואל אם רוצה לקבל הצעות מחברות אחרות
3️⃣ ↩️ חזרה`;
    
    await client.sendMessage(phoneNumber, supportTypeMessage);
    userSession.state = BOT_STATES.SUPPORT_TYPE;
}

// Handle support type
async function handleSupportType(phoneNumber, userSession, messageText) {
    if (messageText.includes("1") || messageText.includes("טכני")) {
        const techSupportMessage = `🛠️ שירות לקוחות טכני:
📞 טלפון: 1-800-XXX-XXX
📧 אימייל: support@company.com
🌐 אתר: www.company.com/support`;
        await client.sendMessage(phoneNumber, techSupportMessage);
    } else if (messageText.includes("2") || messageText.includes("התנתקות")) {
        const cancellationMessage = `�� קישור להתנתקות: www.company.com/cancel
        
רוצה לקבל הצעות מחברות אחרות?`;
        await client.sendMessage(phoneNumber, cancellationMessage);
        // Return to package selection
        userSession.state = BOT_STATES.SELECT_CATEGORY;
        return;
    } else {
        const invalidMessage = `❌ אנא בחר אפשרות תקפה:
1️⃣ שירות טכני
2️⃣ התנתקות
3️⃣ ↩️ חזרה`;
        await client.sendMessage(phoneNumber, invalidMessage);
        return;
    }
    
    await showOptionalChecks(phoneNumber, userSession);
}

// Show optional checks
async function showOptionalChecks(phoneNumber, userSession) {
    const checksMessage = `📡 רוצה לבצע בדיקות נוספות?

🌐 בדיקת מהירות גלישה: [קישור]
📶 בדיקת סיבים לפי כתובת: [קישור]
📱 בדיקת אנטנה סלולרית: [קישור]

תודה שהשתמשת ב-LoroBot! 🎉`;
    
    await client.sendMessage(phoneNumber, checksMessage);
    userSession.state = BOT_STATES.OPTIONAL_CHECKS;
}

// Handle optional checks
async function handleOptionalChecks(phoneNumber, userSession, messageText) {
    // End of conversation - reset session
    userSessions.delete(phoneNumber);
    const endMessage = `👋 תודה שהשתמשת ב-LoroBot! אם תרצה להתחיל מחדש, פשוט שלח הודעה.`;
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
            const backMessage = `↩️ חזרה לשלב הקודם...`;
            await client.sendMessage(phoneNumber, backMessage);
    }
}

// Event handlers
client.on("qr", (qr) => {
    console.log("QR Code generated. Scan with WhatsApp:");
    qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
    console.log("LoroBot is ready! 🤖");
});

client.on("message", async (message) => {
    if (message.from === "status@broadcast") return;
    
    try {
        await processMessage(message);
    } catch (error) {
        console.error("Error processing message:", error);
        await client.sendMessage(message.from, "❌ אירעה שגיאה. אנא נסה שוב.");
    }
});

// Initialize the client
client.initialize();

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
