// DOM Elements
const uploadForm = document.getElementById('uploadForm');
const cvInput = document.getElementById('cvInput');
const statusDiv = document.getElementById('status');
const formContainer = document.getElementById('formContainer');
const downloadBtn = document.getElementById('downloadBtn');

// Add API configuration at the top


// Add Tesseract.js configuration
const TESSERACT_WORKER_PATH = 'https://unpkg.com/tesseract.js@v2.1.0/dist/worker.min.js';

// CV Data Structure with more detailed categories
let cvData = {
  personalInfo: {
    fullName: '',
    email: '',
    phone: '',
    location: '',
    summary: ''
  },
  education: [{
    institution: '',
    degree: '',
    field: '',
    startDate: '',
    endDate: '',
    description: ''
  }],
  experience: [{
    company: '',
    position: '',
    startDate: '',
    endDate: '',
    location: '',
    description: '',
    achievements: []
  }],
  skills: {
    technical: [],
    soft: [],
    languages: [],
    tools: []
  },
  certifications: [{
    name: '',
    issuer: '',
    date: '',
    description: ''
  }],
  projects: [{
    name: '',
    role: '',
    duration: '',
    description: '',
    technologies: [],
    achievements: []
  }]
};

// DocuPanda API configuration
const DOCUPANDA_API_KEY = 'GLnaFU5O7xf6DEykYH3RF5HE7J32';
const DOCUPANDA_API_URL = 'https://app.docupanda.io/document';
const POLLING_INTERVAL = 2000; // 2 seconds
const MAX_POLLING_ATTEMPTS = 30; // 1 minute maximum

// Handle form submission
uploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const file = cvInput.files[0];
  
  if (!file) {
    updateStatus('Please select a file first', 'error');
    return;
  }

  try {
    updateStatus('Uploading document...', 'processing');
    
    // Send file to DocuPanda API
    const extractedData = await analyzeCVWithAI(file);
    
    // Display the extracted data
    displayExtractedData(extractedData);
    updateStatus('CV processed successfully!', 'success');
    downloadBtn.style.display = 'block';
  } catch (error) {
    console.error('Error:', error);
    updateStatus('Error processing file: ' + error.message, 'error');
  }
});

// Reset upload form
function resetUpload() {
  document.querySelector('.upload-area').style.display = 'block';
  document.querySelector('.submit-btn').style.display = 'block';
  document.querySelector('.uploaded-file-info').remove();
  cvInput.value = '';
  updateStatus('Waiting for upload...', '');
}

// Load last uploaded CV if exists
function loadLastUploadedCV() {
  const savedData = localStorage.getItem('lastUploadedCV');
  if (savedData) {
    try {
      const fileData = JSON.parse(savedData);
      cvData = fileData.cvData;
      displayCVData();
      
      // Hide upload form and show uploaded file info
      document.querySelector('.upload-area').style.display = 'none';
      document.querySelector('.submit-btn').style.display = 'none';
      
      // Remove any existing uploaded file info
      const existingInfo = document.querySelector('.uploaded-file-info');
      if (existingInfo) {
        existingInfo.remove();
      }
      
      const uploadedInfo = document.createElement('div');
      uploadedInfo.className = 'uploaded-file-info';
      uploadedInfo.innerHTML = `
        <div class="file-info">
          <span class="file-icon">📄</span>
          <div class="file-details">
            <span class="file-name">${fileData.fileName}</span>
            <span class="upload-time">Uploaded: ${new Date(fileData.uploadDate).toLocaleString()}</span>
          </div>
          <button class="change-file-btn" onclick="resetUpload()">Change File</button>
        </div>
      `;
      
      // Insert the uploaded file info after the form
      const form = document.querySelector('form');
      form.parentNode.insertBefore(uploadedInfo, form.nextSibling);
      
      updateStatus(`Loaded last uploaded CV: ${fileData.fileName}`, 'success');
      downloadBtn.style.display = 'block';
    } catch (error) {
      console.error('Error loading saved CV:', error);
    }
  }
}

// Show success animation
function showSuccessAnimation() {
  const successDiv = document.createElement('div');
  successDiv.className = 'success-animation';
  successDiv.innerHTML = `
    <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
      <circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
      <path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
    </svg>
    <span class="success-text">Upload Successful!</span>
  `;
  
  document.body.appendChild(successDiv);
  
  // Remove animation after 3 seconds
  setTimeout(() => {
    successDiv.remove();
  }, 3000);
}

// Load last uploaded CV when page loads
document.addEventListener('DOMContentLoaded', loadLastUploadedCV);

// Extract text from file based on type
async function extractTextFromFile(file) {
  if (file.type === 'application/pdf') {
    return await extractTextFromPDF(file);
  } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return await extractTextFromDOCX(file);
  } else {
    throw new Error('Unsupported file type');
  }
}

// Extract text from PDF
async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDocument = await loadingTask.promise;
  let text = '';
  
  for (let i = 1; i <= pdfDocument.numPages; i++) {
    const page = await pdfDocument.getPage(i);
    const textContent = await page.getTextContent();
    text += textContent.items.map(item => item.str).join(' ') + '\n';
  }
  
  return text;
}

// Extract text from DOCX
async function extractTextFromDOCX(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

// Function to handle image upload and OCR
async function handleImageUpload(file) {
  try {
    updateStatus('Processing image with OCR...', 'processing');
    
    // Initialize Tesseract
    const { createWorker } = Tesseract;
    const worker = await createWorker({
      workerPath: TESSERACT_WORKER_PATH,
      langPath: 'https://tessdata.projectnaptha.com/4.0.0',
      logger: m => console.log(m)
    });

    // Load language data
    await worker.loadLanguage('eng');
    await worker.initialize('eng');

    // Perform OCR
    const { data: { text } } = await worker.recognize(file);
    
    // Terminate worker
    await worker.terminate();

    // Process the extracted text
    return text;
  } catch (error) {
    console.error('OCR Error:', error);
    throw new Error('Failed to process image with OCR');
  }
}

// Enhanced CV analysis function
async function analyzeCVWithAI(file) {
    try {
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('file', file);

        // Make the initial POST request to start processing
        const response = await fetch(DOCUPANDA_API_URL, {
            method: 'POST',
            headers: {
                'X-API-Key': DOCUPANDA_API_KEY
            },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        // Check if we got a document ID
        if (!result.documentId) {
            throw new Error('No document ID received from API');
        }

        // Start polling for results
        return await pollForResults(result.documentId);
    } catch (error) {
        console.error('AI analysis error:', error);
        throw error;
    }
}

// Add progress bar styles
const style = document.createElement('style');
style.textContent = `
    /* Loading spinner styles */
    .loading-spinner {
        display: inline-block;
        width: 20px;
        height: 20px;
        border: 3px solid rgba(0, 0, 0, 0.1);
        border-radius: 50%;
        border-top-color: #007bff;
        animation: spin 1s ease-in-out infinite;
        margin-right: 10px;
        vertical-align: middle;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    /* Progress bar styles */
    .progress-container {
        width: 100%;
        background-color: #f1f1f1;
        border-radius: 4px;
        margin: 10px 0;
    }

    .progress-bar {
        height: 20px;
        background-color: #4CAF50;
        border-radius: 4px;
        width: 0%;
        transition: width 0.3s ease-in-out;
    }

    .progress-text {
        text-align: center;
        margin-top: 5px;
        font-size: 14px;
        color: #666;
    }

    .time-remaining {
        font-size: 12px;
        color: #666;
        margin-top: 5px;
    }

    /* Status message styles */
    .status-message {
        padding: 10px;
        margin: 10px 0;
        border-radius: 4px;
    }

    .status-message.processing {
        background-color: #e3f2fd;
        color: #0d47a1;
    }

    .status-message.success {
        background-color: #e8f5e9;
        color: #2e7d32;
    }

    .status-message.error {
        background-color: #ffebee;
        color: #c62828;
    }

    /* Refresh button styles */
    .refresh-btn {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 10px 20px;
        background-color: #ff4444;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 16px;
        transition: background-color 0.3s;
    }
    
    .refresh-btn:hover {
        background-color: #cc0000;
    }
    
    /* Confirmation dialog styles */
    .confirmation-dialog {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: white;
        padding: 20px;
        border-radius: 5px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        z-index: 1000;
        text-align: center;
    }
    
    .confirmation-dialog button {
        margin: 10px;
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }
    
    .confirmation-dialog .confirm-btn {
        background-color: #ff4444;
        color: white;
    }
    
    .confirmation-dialog .cancel-btn {
        background-color: #666;
        color: white;
    }
    
    .overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 999;
    }
`;
document.head.appendChild(style);

// Function to update progress
function updateProgress(attempts, maxAttempts) {
    const progress = (attempts / maxAttempts) * 100;
    const timeRemaining = Math.max(0, Math.ceil((maxAttempts - attempts) * (POLLING_INTERVAL / 1000)));
    
    const statusDiv = document.getElementById('status');
    statusDiv.innerHTML = `
        <div class="loading-spinner"></div>
        <div>Processing document...</div>
        <div class="progress-container">
            <div class="progress-bar" style="width: ${progress}%"></div>
        </div>
        <div class="progress-text">${Math.round(progress)}% complete</div>
        <div class="time-remaining">Estimated time remaining: ${timeRemaining} seconds</div>
    `;
}

// Function to poll for results
async function pollForResults(documentId) {
    let attempts = 0;
    
    while (attempts < MAX_POLLING_ATTEMPTS) {
        try {
            // Update progress
            updateProgress(attempts, MAX_POLLING_ATTEMPTS);

            // Make GET request to check document status
            const response = await fetch(`${DOCUPANDA_API_URL}/${documentId}`, {
                method: 'GET',
                headers: {
                    'accept': 'application/json',
                    'X-API-Key': DOCUPANDA_API_KEY
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            // Check if we have the extracted data
            if (result.data) {
                return result.data; // Return the extracted data
            } else if (result.error) {
                throw new Error(result.error);
            }

            // Wait before next poll
            await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
            attempts++;
        } catch (error) {
            console.error('Polling error:', error);
            throw error;
        }
    }

    throw new Error('Maximum polling attempts reached');
}

// Function to display extracted CV data
function displayExtractedData(data) {
    const formContainer = document.getElementById('formContainer');
    
    // Clear previous content
    formContainer.innerHTML = '';
    
    // Display each section from the API response
    for (const [section, content] of Object.entries(data)) {
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'cv-section';
        
        // Create section header
        const header = document.createElement('h2');
        header.textContent = section.charAt(0).toUpperCase() + section.slice(1).replace(/_/g, ' ');
        sectionDiv.appendChild(header);
        
        // Create content container
        const contentDiv = document.createElement('div');
        contentDiv.className = 'info-card';
        
        if (Array.isArray(content)) {
            // Handle array content (like education, experience, etc.)
            content.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'info-item';
                
                for (const [key, value] of Object.entries(item)) {
                    const fieldDiv = document.createElement('div');
                    fieldDiv.className = 'field';
                    
                    const label = document.createElement('strong');
                    label.textContent = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ') + ': ';
                    
                    const valueSpan = document.createElement('span');
                    valueSpan.className = 'editable';
                    valueSpan.textContent = value || 'Not specified';
                    valueSpan.onclick = () => makeEditable(valueSpan);
                    
                    fieldDiv.appendChild(label);
                    fieldDiv.appendChild(valueSpan);
                    itemDiv.appendChild(fieldDiv);
                }
                
                contentDiv.appendChild(itemDiv);
            });
        } else if (typeof content === 'object') {
            // Handle object content (like personal info, skills, etc.)
            for (const [key, value] of Object.entries(content)) {
                const fieldDiv = document.createElement('div');
                fieldDiv.className = 'field';
                
                const label = document.createElement('strong');
                label.textContent = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ') + ': ';
                
                const valueSpan = document.createElement('span');
                valueSpan.className = 'editable';
                valueSpan.textContent = value || 'Not specified';
                valueSpan.onclick = () => makeEditable(valueSpan);
                
                fieldDiv.appendChild(label);
                fieldDiv.appendChild(valueSpan);
                contentDiv.appendChild(fieldDiv);
            }
        } else {
            // Handle simple values
            const valueDiv = document.createElement('div');
            valueDiv.className = 'field';
            valueDiv.textContent = content;
            contentDiv.appendChild(valueDiv);
        }
        
        sectionDiv.appendChild(contentDiv);
        formContainer.appendChild(sectionDiv);
    }
}

// Display CV data in editable cards
function displayCVData() {
    formContainer.innerHTML = `
        <div class="cv-section">
            <h2>Personal Information</h2>
            <div class="info-card">
                ${Object.entries(cvData.personalInfo).map(([key, value]) => `
                    <div class="info-item">
                        <strong>${key.charAt(0).toUpperCase() + key.slice(1)}:</strong>
                        <span class="editable" onclick="makeEditable(this)">${value || 'Not found'}</span>
                        <button class="copy-btn" onclick="copyText('${value || ''}')">Copy</button>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="cv-section">
            <h2>Education</h2>
            <div class="info-card">
                ${cvData.education.length > 0 ? cvData.education.map(edu => `
                    <div class="education-item">
                        ${Object.entries(edu).map(([key, value]) => `
                            <div class="info-item">
                                <strong>${key.charAt(0).toUpperCase() + key.slice(1)}:</strong>
                                <span class="editable" onclick="makeEditable(this)">${value || 'Not found'}</span>
                                <button class="copy-btn" onclick="copyText('${value || ''}')">Copy</button>
                            </div>
                        `).join('')}
                    </div>
                `).join('') : '<p>No education information found</p>'}
            </div>
        </div>

        <div class="cv-section">
            <h2>Experience</h2>
            <div class="info-card">
                ${cvData.experience.length > 0 ? cvData.experience.map(exp => `
                    <div class="experience-item">
                        ${Object.entries(exp).map(([key, value]) => `
                            <div class="info-item">
                                <strong>${key.charAt(0).toUpperCase() + key.slice(1)}:</strong>
                                ${Array.isArray(value) ? `
                                    <ul>
                                        ${value.map(item => `
                                            <li>
                                                <span class="editable" onclick="makeEditable(this)">${item}</span>
                                                <button class="copy-btn" onclick="copyText('${item}')">Copy</button>
                                            </li>
                                        `).join('')}
                                    </ul>
                                ` : `
                                    <span class="editable" onclick="makeEditable(this)">${value || 'Not found'}</span>
                                    <button class="copy-btn" onclick="copyText('${value || ''}')">Copy</button>
                                `}
                            </div>
                        `).join('')}
                    </div>
                `).join('') : '<p>No experience information found</p>'}
            </div>
        </div>

        <div class="cv-section">
            <h2>Skills</h2>
            <div class="info-card">
                <div class="skills-grid">
                    ${Object.entries(cvData.skills).map(([category, skills]) => `
                        <div class="skill-category">
                            <h3>${category}</h3>
                            <ul>
                                ${skills.map(skill => `
                                    <li>
                                        <span class="editable" onclick="makeEditable(this)">${skill}</span>
                                        <button class="copy-btn" onclick="copyText('${skill}')">Copy</button>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>

        <div class="cv-section">
            <h2>Certifications</h2>
            <div class="info-card">
                ${cvData.certifications.length > 0 ? cvData.certifications.map(cert => `
                    <div class="certification-item">
                        ${Object.entries(cert).map(([key, value]) => `
                            <div class="info-item">
                                <strong>${key.charAt(0).toUpperCase() + key.slice(1)}:</strong>
                                <span class="editable" onclick="makeEditable(this)">${value || 'Not found'}</span>
                                <button class="copy-btn" onclick="copyText('${value || ''}')">Copy</button>
                            </div>
                        `).join('')}
                    </div>
                `).join('') : '<p>No certifications found</p>'}
            </div>
        </div>

        <div class="cv-section">
            <h2>Projects</h2>
            <div class="info-card">
                ${cvData.projects.length > 0 ? cvData.projects.map(project => `
                    <div class="project-item">
                        ${Object.entries(project).map(([key, value]) => `
                            <div class="info-item">
                                <strong>${key.charAt(0).toUpperCase() + key.slice(1)}:</strong>
                                ${Array.isArray(value) ? `
                                    <ul>
                                        ${value.map(item => `
                                            <li>
                                                <span class="editable" onclick="makeEditable(this)">${item}</span>
                                                <button class="copy-btn" onclick="copyText('${item}')">Copy</button>
                                            </li>
                                        `).join('')}
                                    </ul>
                                ` : `
                                    <span class="editable" onclick="makeEditable(this)">${value || 'Not found'}</span>
                                    <button class="copy-btn" onclick="copyText('${value || ''}')">Copy</button>
                                `}
                            </div>
                        `).join('')}
                    </div>
                `).join('') : '<p>No projects found</p>'}
            </div>
        </div>
    `;
}

// Update CV data functions
function updatePersonalInfo(field, value) {
  cvData.personalInfo[field] = value;
}

function updateEducation(index, field, value) {
  cvData.education[index][field] = value;
}

function updateEducationDuration(index, value) {
  const [start, end] = value.split(' - ');
  cvData.education[index].startDate = start;
  cvData.education[index].endDate = end;
}

function updateExperience(index, field, value) {
  cvData.experience[index][field] = value;
}

function updateExperienceDuration(index, value) {
  const [start, end] = value.split(' - ');
  cvData.experience[index].startDate = start;
  cvData.experience[index].endDate = end;
}

function updateAchievement(expIndex, achievementIndex, value) {
  cvData.experience[expIndex].achievements[achievementIndex] = value;
}

function addAchievement(expIndex) {
  cvData.experience[expIndex].achievements.push('');
  displayCVData();
}

function removeAchievement(expIndex, achievementIndex) {
  cvData.experience[expIndex].achievements.splice(achievementIndex, 1);
  displayCVData();
}

function updateSkill(category, index, value) {
  cvData.skills[category][index] = value;
}

function addSkill(category) {
  cvData.skills[category].push('');
  displayCVData();
}

function removeSkill(category, index) {
  cvData.skills[category].splice(index, 1);
  displayCVData();
}

function updateCertification(index, field, value) {
  cvData.certifications[index][field] = value;
}

function updateProject(index, field, value) {
  cvData.projects[index][field] = value;
}

function updateTechnology(projectIndex, techIndex, value) {
  cvData.projects[projectIndex].technologies[techIndex] = value;
}

function addTechnology(projectIndex) {
  cvData.projects[projectIndex].technologies.push('');
  displayCVData();
}

function removeTechnology(projectIndex, techIndex) {
  cvData.projects[projectIndex].technologies.splice(techIndex, 1);
  displayCVData();
}

function updateProjectAchievement(projectIndex, achievementIndex, value) {
  cvData.projects[projectIndex].achievements[achievementIndex] = value;
}

function addProjectAchievement(projectIndex) {
  cvData.projects[projectIndex].achievements.push('');
  displayCVData();
}

function removeProjectAchievement(projectIndex, achievementIndex) {
  cvData.projects[projectIndex].achievements.splice(achievementIndex, 1);
  displayCVData();
}

// Add new functions for education management
function addEducation() {
  cvData.education.push({
    institution: '',
    degree: '',
    field: '',
    startDate: '',
    endDate: '',
    description: ''
  });
  displayCVData();
}

function removeEducation(index) {
  cvData.education.splice(index, 1);
  displayCVData();
}

// Handle download button click
downloadBtn.addEventListener('click', () => {
  const jsonStr = JSON.stringify(cvData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'cv_data.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// Update status message
function updateStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = `status-message ${type}`;
  
  // Add loading spinner for processing status
  if (type === 'processing') {
    statusDiv.innerHTML = `
      <div class="loading-spinner"></div>
      <span>${message}</span>
    `;
  }
}

// Add AI-powered suggestions function
async function getAISuggestions(section, currentContent) {
  try {
    const response = await fetch(GOOGLE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GOOGLE_API_KEY}`
      },
      body: JSON.stringify({
        document: {
          content: currentContent,
          type: 'PLAIN_TEXT'
        },
        encodingType: 'UTF8'
      })
    });

    if (!response.ok) {
      throw new Error('AI suggestions failed');
    }

    const data = await response.json();
    return data.entities.map(entity => entity.name).join('\n');
  } catch (error) {
    console.error('AI Suggestions Error:', error);
    return null;
  }
}

// Add function to handle AI suggestions
async function getSuggestions(section, button) {
  try {
    button.disabled = true;
    button.textContent = 'Getting suggestions...';
    
    let content = '';
    switch(section) {
      case 'name':
        content = cvData.personalInfo.fullName;
        break;
      case 'profile':
        content = cvData.personalInfo.summary;
        break;
      case 'keySkills':
        content = cvData.skills.technical.join(', ');
        break;
      case 'softSkills':
        content = cvData.skills.soft.join(', ');
        break;
      case 'certifications':
        content = cvData.certifications.map(c => c.name).join(', ');
        break;
      case 'projects':
        content = cvData.projects.map(p => p.name).join('\n\n');
        break;
    }
    
    const suggestions = await getAISuggestions(section, content);
    
    if (suggestions) {
      const suggestionsDiv = document.createElement('div');
      suggestionsDiv.className = 'suggestions-popup';
      suggestionsDiv.innerHTML = `
        <h3>AI Suggestions for ${section}</h3>
        <div class="suggestions-content">${suggestions}</div>
        <button onclick="this.parentElement.remove()">Close</button>
      `;
      
      button.parentElement.appendChild(suggestionsDiv);
    }
  } catch (error) {
    console.error('Error getting suggestions:', error);
  } finally {
    button.disabled = false;
    button.textContent = 'Get AI Suggestions';
  }
}

// Update the file input to accept images
cvInput.accept = '.docx,.pdf,.jpg,.jpeg,.png,.tiff';

// Function to make text editable
function makeEditable(element) {
    const text = element.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = text;
    input.className = 'editable-input';
    
    element.textContent = '';
    element.appendChild(input);
    
    input.focus();
    
    input.addEventListener('blur', () => {
        element.textContent = input.value;
    });
    
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            element.textContent = input.value;
        }
    });
}

// Function to copy text
function copyText(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('Text copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
}

// Add refresh button to the container
const container = document.querySelector('.container');
const refreshButton = document.createElement('button');
refreshButton.id = 'refreshBtn';
refreshButton.className = 'refresh-btn';
refreshButton.textContent = 'Start New CV';
container.appendChild(refreshButton);

// Add refresh functionality
refreshButton.addEventListener('click', () => {
  // Check if there's any data to lose
  if (Object.keys(cvData).length > 0) {
    showConfirmationDialog();
  } else {
    refreshPage();
  }
});

function showConfirmationDialog() {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  
  const dialog = document.createElement('div');
  dialog.className = 'confirmation-dialog';
  dialog.innerHTML = `
    <h3>Start New CV</h3>
    <p>Are you sure you want to start a new CV? All current data will be lost.</p>
    <button class="confirm-btn">Yes, Start New</button>
    <button class="cancel-btn">Cancel</button>
  `;
  
  document.body.appendChild(overlay);
  document.body.appendChild(dialog);
  
  dialog.querySelector('.confirm-btn').addEventListener('click', () => {
    refreshPage();
    document.body.removeChild(overlay);
    document.body.removeChild(dialog);
  });
  
  dialog.querySelector('.cancel-btn').addEventListener('click', () => {
    document.body.removeChild(overlay);
    document.body.removeChild(dialog);
  });
}

function refreshPage() {
  // Clear the form container
  formContainer.innerHTML = '';
  
  // Reset the CV data
  cvData = {
    personalInfo: {
      fullName: '',
      email: '',
      phone: '',
      location: '',
      summary: ''
    },
    education: [],
    experience: [],
    skills: {
      technical: [],
      soft: [],
      languages: [],
      tools: []
    },
    certifications: [],
    projects: []
  };
  
  // Reset the upload form
  document.querySelector('.upload-area').style.display = 'block';
  document.querySelector('.submit-btn').style.display = 'block';
  cvInput.value = '';
  
  // Hide the download button
  downloadBtn.style.display = 'none';
  
  // Reset status message
  updateStatus('Waiting for upload...', '');
  
  // Clear any existing file info
  const existingInfo = document.querySelector('.uploaded-file-info');
  if (existingInfo) {
    existingInfo.remove();
  }
  
  // Clear localStorage
  localStorage.removeItem('lastUploadedCV');
}
  