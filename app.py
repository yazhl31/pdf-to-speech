from flask import Flask, render_template, request, jsonify, send_file
from pypdf import PdfReader
from gtts import gTTS
import io

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024
ALLOWED_EXTENSIONS = {"pdf"}

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/upload", methods=["POST"])
def upload():
    pdf_file = request.files.get("pdf")

    if not pdf_file or pdf_file.filename == "":
        return render_template("index.html", error="Please select a PDF file.")

    if not allowed_file(pdf_file.filename):
        return render_template("index.html", error="Only PDF files are allowed.")

    try:
        reader = PdfReader(pdf_file)
        text_parts = []

        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)

        text = "\n".join(text_parts).strip()

        if not text:
            return render_template(
                "index.html",
                error="No readable text was found. This may be a scanned PDF."
            )

        page_count = len(reader.pages)
        word_count = len(text.split())
        character_count = len(text)
        reading_minutes = max(1, round(word_count / 200))

        return render_template(
            "index.html",
            extracted_text=text,
            filename=pdf_file.filename,
            page_count=page_count,
            word_count=word_count,
            character_count=character_count,
            reading_minutes=reading_minutes
        )

    except Exception:
        return render_template(
            "index.html",
            error="The PDF could not be processed. Please check that it is valid."
        )

@app.route("/generate-audio", methods=["POST"])
def generate_audio():
    data = request.get_json(silent=True) or {}
    text = data.get("text", "").strip()

    if not text:
        return jsonify({"error": "There is no text to convert."}), 400

    try:
        audio = gTTS(text=text, lang="en")
        audio_file = io.BytesIO()
        audio.write_to_fp(audio_file)
        audio_file.seek(0)

        return send_file(
            audio_file,
            mimetype="audio/mpeg",
            as_attachment=False,
            download_name="pdf-speech.mp3"
        )
    except Exception:
        return jsonify({
            "error": "MP3 generation failed. Please check your internet connection."
        }), 500

@app.errorhandler(413)
def file_too_large(error):
    return render_template(
        "index.html",
        error="The PDF is too large. Maximum file size is 10 MB."
    ), 413

if __name__ == "__main__":
    app.run()
