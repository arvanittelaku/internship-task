const form = document.getElementById("roast-form");
const usernameInput = document.getElementById("username");
const styleInput = document.getElementById("style");
const inputWrap = document.querySelector(".input-wrap");
const submitBtn = document.getElementById("submit-btn");

const resultSection = document.getElementById("result-section");
const stateLoading = document.getElementById("state-loading");
const stateError = document.getElementById("state-error");
const stateRoast = document.getElementById("state-roast");

const loadingText = document.getElementById("loading-text");
const errorText = document.getElementById("error-text");
const roastText = document.getElementById("roast-text");

const roastAgainBtn = document.getElementById("roast-again");
const errorRetryBtn = document.getElementById("error-retry");
const shareBtn = document.getElementById("share-btn");

const BTN_LABEL_DEFAULT = "Roast Me";
const BTN_LABEL_LOADING = "Roasting... 🔥";
const SHARE_LABEL_DEFAULT = "Share";
const SHARE_LABEL_COPIED = "Copied!";

const GITHUB_USERNAME_RE = /^[a-zA-Z0-9-]+$/;

const LOADING_MESSAGES = [
  "Reading your commit history... 👀",
  "Counting tutorial repos you'll never finish...",
  "Measuring README shame index...",
  "Checking if 'initial commit' is your magnum opus...",
  "Asking Claude to be gentle (lying)...",
];

let loadingInterval = null;
let selectedStyle = "savage";
let lastRoastPlainText = "";

const fieldHint = document.createElement("p");
fieldHint.className = "field-hint hidden";
fieldHint.setAttribute("role", "alert");
inputWrap.insertAdjacentElement("afterend", fieldHint);

function setStyle(style) {
  selectedStyle = style;
  styleInput.value = style;
  document.querySelectorAll(".style-pill").forEach((pill) => {
    pill.classList.toggle("active", pill.dataset.style === style);
  });
}

document.querySelectorAll(".style-pill").forEach((pill) => {
  pill.addEventListener("click", () => setStyle(pill.dataset.style));
});

setStyle("savage");

function isValidGitHubUsername(value) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return GITHUB_USERNAME_RE.test(trimmed);
}

function setSubmitLoading(isLoading) {
  submitBtn.disabled = isLoading;
  submitBtn.textContent = isLoading ? BTN_LABEL_LOADING : BTN_LABEL_DEFAULT;
}

function hideFieldHint() {
  fieldHint.classList.add("hidden");
  fieldHint.textContent = "";
  inputWrap.classList.remove("input-invalid");
}

function showFieldError(message, shake = true) {
  fieldHint.textContent = message;
  fieldHint.classList.remove("hidden");
  inputWrap.classList.add("input-invalid");
  if (shake) {
    inputWrap.classList.remove("shake");
    void inputWrap.offsetWidth;
    inputWrap.classList.add("shake");
  }
  usernameInput.focus();
}

function showValidationError() {
  showFieldError("Enter a username first");
}

function showInvalidUsernameError() {
  showFieldError(
    "GitHub usernames can only contain letters, numbers, and hyphens"
  );
}

function showResultState(state) {
  resultSection.classList.remove("hidden");
  stateLoading.classList.toggle("hidden", state !== "loading");
  stateError.classList.toggle("hidden", state !== "error");
  stateRoast.classList.toggle("hidden", state !== "roast");
}

function hideResultSection() {
  resultSection.classList.add("hidden");
  stateRoast.classList.remove("roast-visible");
  stopLoadingMessages();
  resetShareButton();
}

function startLoadingMessages() {
  let i = 0;
  loadingText.textContent = LOADING_MESSAGES[0];
  loadingInterval = setInterval(() => {
    i = (i + 1) % LOADING_MESSAGES.length;
    loadingText.textContent = LOADING_MESSAGES[i];
  }, 2200);
}

function stopLoadingMessages() {
  clearInterval(loadingInterval);
  loadingInterval = null;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatRoast(text) {
  const prefix = '<span class="terminal-prompt" aria-hidden="true">&gt; </span>';
  return text
    .split(/\n\n+/)
    .map((p) => `<p>${prefix}${escapeHtml(p.trim())}</p>`)
    .join("");
}

function resetShareButton() {
  shareBtn.textContent = SHARE_LABEL_DEFAULT;
  shareBtn.classList.remove("copied");
}

function showRoastWithFade(roast) {
  lastRoastPlainText = roast;
  roastText.innerHTML = formatRoast(roast);
  resetShareButton();
  showResultState("roast");
  stateRoast.classList.remove("roast-visible");
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      stateRoast.classList.add("roast-visible");
    });
  });
}

function resetToForm() {
  hideResultSection();
  setSubmitLoading(false);
  usernameInput.focus();
}

roastAgainBtn.addEventListener("click", resetToForm);
errorRetryBtn.addEventListener("click", resetToForm);

shareBtn.addEventListener("click", async () => {
  if (!lastRoastPlainText) return;

  try {
    await navigator.clipboard.writeText(lastRoastPlainText);
    shareBtn.textContent = SHARE_LABEL_COPIED;
    shareBtn.classList.add("copied");
    setTimeout(() => {
      if (shareBtn.textContent === SHARE_LABEL_COPIED) {
        resetShareButton();
      }
    }, 2000);
  } catch {
    shareBtn.textContent = "Copy failed";
    setTimeout(resetShareButton, 2000);
  }
});

usernameInput.addEventListener("input", () => {
  const value = usernameInput.value.trim();
  if (!value) {
    hideFieldHint();
    return;
  }
  if (isValidGitHubUsername(value)) {
    hideFieldHint();
  }
});

usernameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    form.requestSubmit();
  }
});

inputWrap.addEventListener("animationend", (e) => {
  if (e.animationName === "shake") {
    inputWrap.classList.remove("shake");
  }
});

async function runRoast() {
  const username = usernameInput.value.trim();

  if (!username) {
    showValidationError();
    return;
  }

  if (!isValidGitHubUsername(username)) {
    showInvalidUsernameError();
    return;
  }

  hideFieldHint();
  hideResultSection();
  showResultState("loading");
  startLoadingMessages();
  setSubmitLoading(true);

  try {
    const res = await fetch("/api/roast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, style: selectedStyle }),
    });

    let data = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }

    if (!res.ok) {
      errorText.textContent = data.error || "Something went wrong. Try again.";
      showResultState("error");
      return;
    }

    showRoastWithFade(data.roast || "");
  } catch {
    errorText.textContent = "Network error — is the server running?";
    showResultState("error");
  } finally {
    stopLoadingMessages();
    setSubmitLoading(false);
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  runRoast();
});
