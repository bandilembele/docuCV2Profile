const DOCUPANDA_API_KEY = 'GLnaFU5O7xf6DEykYH3RF5HE7J32';
const DOCUPANDA_API_URL = 'https://app.docupanda.io/document';

export async function extractFromDocument(fileContent, fileType) {
  try {
    const response = await fetch(DOCUPANDA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DOCUPANDA_API_KEY}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        content: fileContent,
        type: fileType,
        extract_fields: [
          'full_name',
          'email',
          'phone',
          'location',
          'summary',
          'education',
          'experience',
          'skills',
          'certifications',
          'projects'
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error extracting data:', error);
    throw error;
  }
} 