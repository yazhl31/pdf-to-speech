# PDF to Speech

A Flask web application that extracts text from PDFs and converts it into speech.

## Features
- PDF upload and drag-and-drop
- Text extraction with pypdf
- PDF validation and 10 MB limit
- Editable extracted text
- Page, word and reading-time statistics
- Browser text-to-speech
- Voice and speed controls
- Play, pause, resume and stop
- Speech progress indicator
- Copy and clear tools
- Save edited text as PDF
- Create and download MP3 with gTTS
- Responsive UI with Lucide icons

## Run
```powershell
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Open http://127.0.0.1:5000

MP3 creation requires an internet connection because gTTS uses an online service.
