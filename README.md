# CV Profile Extractor

A web application that extracts and analyzes information from CVs using the DocuPanda API.

## Features

- Upload CVs in various formats (DOCX, PDF, Images)
- Automatic text extraction and analysis
- Structured display of extracted information
- Editable fields for manual corrections
- Download functionality for processed CVs

## Technologies Used

- HTML5
- CSS3
- JavaScript (ES6+)
- DocuPanda API for CV analysis
- Tesseract.js for OCR
- PDF.js for PDF processing
- Mammoth.js for DOCX processing

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/cv-profile.git
cd cv-profile
```

2. Open `index.html` in your web browser

## Usage

1. Click on the upload area or drag and drop your CV file
2. Wait for the file to be processed
3. Review and edit the extracted information
4. Download the processed CV if needed

## API Configuration

The application uses the DocuPanda API for CV analysis. Make sure to set up your API key in the `api/extract.js` file:

```javascript
const DOCUPANDA_API_KEY = 'your_api_key_here';
```

## License

MIT License 