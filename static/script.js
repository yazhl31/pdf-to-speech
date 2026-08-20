
let speech = null;
let voices = [];
let progressTimer = null;

const voiceSelect = document.getElementById("voice");
const speedSlider = document.getElementById("speed");
const textElement = document.getElementById("text");

function loadVoices() {
    if (!voiceSelect) return;
    voices = window.speechSynthesis.getVoices();
    voiceSelect.innerHTML = "";
    voices.forEach((voice, index) => {
        const option = document.createElement("option");
        option.value = index;
        option.textContent = `${voice.name} (${voice.lang})`;
        voiceSelect.appendChild(option);
    });
}
loadVoices();
window.speechSynthesis.onvoiceschanged = loadVoices;

function speakText() {
    if (!textElement) return;
    const text = textElement.innerText.trim();
    if (!text) {
        alert("There is no text available to read.");
        return;
    }

    window.speechSynthesis.cancel();
    speech = new SpeechSynthesisUtterance(text);
    speech.rate = parseFloat(speedSlider.value);
    speech.pitch = 1;
    speech.volume = 1;

    if (voices.length) {
        const selected = voices[voiceSelect.value];
        if (selected) speech.voice = selected;
    }

    speech.onstart = startProgress;
    speech.onend = finishProgress;
    speech.onerror = finishProgress;
    window.speechSynthesis.speak(speech);
}

function pauseSpeech() {
    if (window.speechSynthesis.speaking) window.speechSynthesis.pause();
}

function resumeSpeech() {
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
}

function stopSpeech() {
    window.speechSynthesis.cancel();
    finishProgress();
}

function startProgress() {
    clearInterval(progressTimer);
    progressTimer = setInterval(() => {
        if (!speech || speech.charIndex === undefined) return;
        const total = Math.max(1, getWordCount());
        const spoken = speech.text.slice(0, speech.charIndex).trim().split(/\s+/).filter(Boolean).length;
        updateProgress(Math.min(100, Math.round((spoken / total) * 100)));
    }, 300);
}

function finishProgress() {
    clearInterval(progressTimer);
    updateProgress(100);
    setTimeout(() => {
        if (!window.speechSynthesis.speaking) updateProgress(0);
    }, 1200);
}

function updateProgress(value) {
    const bar = document.getElementById("progress-bar");
    const label = document.getElementById("progress-value");
    if (bar) bar.style.width = `${value}%`;
    if (label) label.textContent = `${value}%`;
}

function getWordCount() {
    if (!textElement) return 0;
    return textElement.innerText.trim().split(/\s+/).filter(Boolean).length;
}

function updateStats() {
    const count = getWordCount();
    const wordCount = document.getElementById("word-count");
    const readingTime = document.getElementById("reading-time");
    if (wordCount) wordCount.textContent = count;
    if (readingTime) readingTime.textContent = Math.max(1, Math.round(count / 200));
}

if (textElement) textElement.addEventListener("input", updateStats);

if (speedSlider) {
    speedSlider.addEventListener("input", function () {
        document.getElementById("speed-value").textContent = `${this.value}x`;
    });
}

const uploadArea = document.getElementById("upload-area");
const pdfInput = document.getElementById("pdf-input");
const fileName = document.getElementById("file-name");

function validatePDF(file) {
    if (!file) return false;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        fileName.textContent = "Please select a PDF file.";
        return false;
    }
    if (file.size > 10 * 1024 * 1024) {
        fileName.textContent = "File is larger than 10 MB.";
        return false;
    }
    fileName.textContent = file.name;
    return true;
}

if (pdfInput) {
    pdfInput.addEventListener("change", function () {
        if (this.files.length) validatePDF(this.files[0]);
    });
}

if (uploadArea) {
    uploadArea.addEventListener("dragover", event => {
        event.preventDefault();
        uploadArea.classList.add("dragging");
    });

    uploadArea.addEventListener("dragleave", () => uploadArea.classList.remove("dragging"));

    uploadArea.addEventListener("drop", event => {
        event.preventDefault();
        uploadArea.classList.remove("dragging");
        const files = event.dataTransfer.files;
        if (files.length && validatePDF(files[0])) pdfInput.files = files;
    });
}

async function generateMP3() {

    const text = textElement?.innerText.trim();

    const button = document.getElementById("mp3-button");
    const status = document.getElementById("audio-status");

    const result = document.getElementById("audio-result");
    const player = document.getElementById("audio-player");

    const download = document.getElementById("download-audio");

    if (!text) {
        alert("There is no text available for MP3 generation.");
        return;
    }

    button.disabled = true;

    button.innerHTML =
        '<i data-lucide="loader-circle"></i>Creating MP3...';

    lucide.createIcons();

    status.textContent = "Generating audio. Please wait...";

    try {

        const response = await fetch("/generate-audio", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                text: text
            })
        });

        if (!response.ok) {

            const data =
                await response.json().catch(() => ({}));

            throw new Error(
                data.error || "MP3 generation failed."
            );
        }

        const blob = await response.blob();

        const url = URL.createObjectURL(blob);

        /* Show audio player */
        player.src = url;

        result.classList.remove("hidden");

        /* Show download button */
        download.href = url;
        download.classList.remove("hidden");

        status.textContent =
            "MP3 created successfully.";

    } catch (error) {

        status.textContent =
            error.message;

    } finally {

        button.disabled = false;

        button.innerHTML =
            '<i data-lucide="music"></i>Create MP3';

        lucide.createIcons();
    }
}
  
async function copyText() {
    if (!textElement) return;
    const text = textElement.innerText.trim();
    if (!text) return alert("There is no text to copy.");
    try {
        await navigator.clipboard.writeText(text);
        alert("Text copied.");
    } catch {
        alert("Copy failed. Please select the text manually.");
    }
}

function clearText() {
    if (!textElement) return;
    if (confirm("Clear the extracted text?")) {
        textElement.innerText = "";
        updateStats();
        stopSpeech();
    }
}


function saveEditedPDF() {

    if (!textElement) {
        return;
    }

    const text = textElement.innerText.trim();

    if (!text) {
        alert("There is no text to save.");
        return;
    }

    if (!window.jspdf) {
        alert("PDF library could not be loaded. Please check your internet connection and refresh the page.");
        return;
    }

    try {

        const { jsPDF } = window.jspdf;

        const pdf = new jsPDF();

        const margin = 20;

        const pageWidth =
            pdf.internal.pageSize.getWidth();

        const pageHeight =
            pdf.internal.pageSize.getHeight();

        const lineHeight = 6;

        const maxWidth =
            pageWidth - (margin * 2);

        const lines =
            pdf.splitTextToSize(text, maxWidth);

        let y = margin;

        pdf.setFont("helvetica", "normal");

        pdf.setFontSize(11);

        lines.forEach(function(line) {

            if (y + lineHeight > pageHeight - margin) {

                pdf.addPage();

                y = margin;
            }

            pdf.text(
                line,
                margin,
                y
            );

            y += lineHeight;
        });

        pdf.save("edited-document.pdf");

    } catch (error) {

        console.error("PDF Error:", error);

        alert(
            "Could not create the PDF. Please refresh the page and try again."
        );
    }
}

lucide.createIcons();