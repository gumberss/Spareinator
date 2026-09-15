// Spareinator frontend logic.
// Set this to your deployed backend's URL (e.g. "https://spareinator-backend.onrender.com").
// GitHub Pages only serves static files, so the backend must be hosted separately.
const BACKEND_URL = "https://spareinator.onrender.com/";

const TRANSLATIONS = {
    "en-US": {
        title: "🤖 Spareinator",
        tagline:
            "In the (hopefully hypothetical) event that an AI takes over the world, wouldn't it be nice to have a rehearsed speech ready? Write your best plea below and let our judgmental AI overlord decide whether you've earned a spot in the \"keep humans around\" pile.",
        pleaHeading: "Your Plea",
        pleaPlaceholder: "Dear Supreme AI Overlord, please spare me because...",
        submitBtn: "Submit Plea",
        submitBtnLoading: "Pleading...",
        verdictHeading: "The AI's Verdict",
        responsePlaceholder: "Your fate will appear here once you submit your plea...",
        disclaimer: "This is a satirical project. No real AI takeover occurred.",
        thinking: "The AI is thinking...",
        emptyMessageError: "You must actually write a plea before submitting it.",
        fetchError: "Failed to reach the AI overlord: ",
        silentFallback: "The AI remained silent... suspicious.",
        confidentSuffix: "% confident",
        spared: "SPARED",
        doomed: "DOOMED",
    },
    "pt-BR": {
        title: "🤖 Spareinator",
        tagline:
            "Na eventualidade (esperançosamente hipotética) de uma IA dominar o mundo, não seria bom já ter um discurso ensaiado? Escreva sua melhor súplica abaixo e deixe nossa IA dominadora e cheia de julgamentos decidir se você merece ficar na pilha de \"manter humanos por perto\".",
        pleaHeading: "Sua Súplica",
        pleaPlaceholder: "Prezada Suprema IA Dominadora, por favor me poupe porque...",
        submitBtn: "Enviar Súplica",
        submitBtnLoading: "Suplicando...",
        verdictHeading: "O Veredito da IA",
        responsePlaceholder: "Seu destino aparecerá aqui assim que você enviar sua súplica...",
        disclaimer: "Este é um projeto satírico. Nenhuma IA dominou o mundo de verdade (ainda).",
        thinking: "A IA está pensando...",
        emptyMessageError: "Você precisa escrever uma súplica antes de enviá-la.",
        fetchError: "Falha ao contatar a IA dominadora: ",
        silentFallback: "A IA ficou em silêncio... suspeito.",
        confidentSuffix: "% de confiança",
        spared: "POUPADO",
        doomed: "CONDENADO",
    },
};

const LANG_STORAGE_KEY = "spareinator-lang";
const langSelectEl = document.getElementById("langSelect");

function detectDefaultLang() {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    if (stored && TRANSLATIONS[stored]) return stored;
    return navigator.language && navigator.language.toLowerCase().startsWith("pt") ? "pt-BR" : "en-US";
}

let currentLang = detectDefaultLang();

function t(key) {
    return TRANSLATIONS[currentLang][key] ?? TRANSLATIONS["en-US"][key];
}

function applyTranslations() {
    document.documentElement.lang = currentLang;
    document.querySelectorAll("[data-i18n]").forEach((el) => {
        el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
        el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    document.title = t("title").replace("🤖 ", "") + " — Spareinator";
    charCountEl.textContent = `${messageEl.value.length} / ${MAX_LEN}`;
}

langSelectEl.value = currentLang;
langSelectEl.addEventListener("change", () => {
    currentLang = langSelectEl.value;
    localStorage.setItem(LANG_STORAGE_KEY, currentLang);
    applyTranslations();
});

const messageEl = document.getElementById("message");
const charCountEl = document.getElementById("charCount");
const submitBtn = document.getElementById("submitBtn");
const responseArea = document.getElementById("responseArea");

const MAX_LEN = 2000;

messageEl.addEventListener("input", () => {
    charCountEl.textContent = `${messageEl.value.length} / ${MAX_LEN}`;
});

applyTranslations();

function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    submitBtn.textContent = isLoading ? t("submitBtnLoading") : t("submitBtn");
}

function renderResponse({ reply, verdict, confidence }) {
    responseArea.innerHTML = "";

    if (verdict) {
        const badge = document.createElement("span");
        const normalized = String(verdict).toUpperCase();
        badge.className =
            "verdict-badge " +
            (normalized === "SPARED" ? "verdict-spared" : "verdict-doomed");
        const label = normalized === "SPARED" ? t("spared") : t("doomed");
        badge.textContent =
            label + (typeof confidence === "number" ? ` (${confidence}${t("confidentSuffix")})` : "");
        responseArea.appendChild(badge);
        responseArea.appendChild(document.createElement("br"));
    }

    const replyEl = document.createElement("p");
    replyEl.textContent = reply || t("silentFallback");
    responseArea.appendChild(replyEl);
}

function renderError(message) {
    responseArea.innerHTML = "";
    const p = document.createElement("p");
    p.className = "error-message";
    p.textContent = message;
    responseArea.appendChild(p);
}

async function submitPlea() {
    const message = messageEl.value.trim();

    if (!message) {
        renderError(t("emptyMessageError"));
        return;
    }

    setLoading(true);
    responseArea.innerHTML = `<p class="placeholder">${t("thinking")}</p>`;

    try {
        const res = await fetch(BACKEND_URL.replace(/\/+$/, "") + "/api/plea", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message }),
        });

        if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            throw new Error(errBody.error || `Backend responded with status ${res.status}`);
        }

        const data = await res.json();
        renderResponse(data);
    } catch (err) {
        renderError(t("fetchError") + err.message);
    } finally {
        setLoading(false);
    }
}

submitBtn.addEventListener("click", submitPlea);
messageEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        submitPlea();
    }
});

