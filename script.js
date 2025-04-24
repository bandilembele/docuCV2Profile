// DOM Elements
const uploadForm = document.getElementById('uploadForm');
const cvInput = document.getElementById('cvInput');
const statusDiv = document.getElementById('status');
const formContainer = document.getElementById('formContainer');
const downloadBtn = document.getElementById('downloadBtn');

// Add API configuration at the top
const GOOGLE_API_KEY = 'YOUR_GOOGLE_CLOUD_API_KEY';
const GOOGLE_API_URL = 'https://language.googleapis.com/v1/documents:analyzeEntities';

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
const DOCUPANDA_API_URL = 'https://api.docupanda.ai/v1/extract';

// Handle form submission
uploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const file = cvInput.files[0];
  
  if (!file) {
    updateStatus('Please select a file first', 'error');
    return;
  }

  try {
    updateStatus('Processing file...', 'processing');
    let text;

    // Extract text based on file type
    if (file.type.startsWith('image/')) {
      text = await handleImageUpload(file);
    } else if (file.type === 'application/pdf') {
      text = await extractTextFromPDF(file);
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      text = await extractTextFromDOCX(file);
    } else {
      throw new Error('Unsupported file type');
    }

    // Send to DocuPanda API
    const extractedData = await analyzeCVWithAI(text);
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
async function analyzeCVWithAI(cvData) {
    try {
        const response = await fetch(DOCUPANDA_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DOCUPANDA_API_KEY}`
            },
            body: JSON.stringify({
                content: cvData,
                type: 'text',
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

        const result = await response.json();
        
        // Transform the result into the expected format
        return {
            personalInfo: {
                fullName: result.full_name || '',
                email: result.email || '',
                phone: result.phone || '',
                location: result.location || '',
                summary: result.summary || ''
            },
            education: result.education || [],
            experience: result.experience || [],
            skills: {
                technical: result.skills?.technical || [],
                soft: result.skills?.soft || [],
                languages: result.skills?.languages || [],
                tools: result.skills?.tools || []
            },
            certifications: result.certifications || [],
            projects: result.projects || []
        };
    } catch (error) {
        console.error('AI analysis error:', error);
        throw error;
    }
}

// Function to display extracted CV data
function displayExtractedData(data) {
    const formContainer = document.getElementById('formContainer');
    formContainer.innerHTML = `
        <div class="cv-section">
            <h2>Personal Information</h2>
            <div class="info-card">
                <p><strong>Name:</strong> ${data.full_name || 'Not found'}</p>
                <p><strong>Email:</strong> ${data.email || 'Not found'}</p>
                <p><strong>Phone:</strong> ${data.phone || 'Not found'}</p>
                <p><strong>Location:</strong> ${data.location || 'Not found'}</p>
                <p><strong>Summary:</strong> ${data.summary || 'Not found'}</p>
            </div>
        </div>

        <div class="cv-section">
            <h2>Education</h2>
            <div class="info-card">
                ${data.education ? data.education.map(edu => `
                    <div class="education-item">
                        <p><strong>Institution:</strong> ${edu.institution || 'Not found'}</p>
                        <p><strong>Degree:</strong> ${edu.degree || 'Not found'}</p>
                        <p><strong>Field:</strong> ${edu.field || 'Not found'}</p>
                        <p><strong>Duration:</strong> ${edu.start_date || 'Not found'} - ${edu.end_date || 'Present'}</p>
                        <p><strong>Description:</strong> ${edu.description || 'Not found'}</p>
                    </div>
                `).join('') : '<p>No education information found</p>'}
            </div>
        </div>

        <div class="cv-section">
            <h2>Experience</h2>
            <div class="info-card">
                ${data.experience ? data.experience.map(exp => `
                    <div class="experience-item">
                        <p><strong>Company:</strong> ${exp.company || 'Not found'}</p>
                        <p><strong>Position:</strong> ${exp.position || 'Not found'}</p>
                        <p><strong>Duration:</strong> ${exp.start_date || 'Not found'} - ${exp.end_date || 'Present'}</p>
                        <p><strong>Location:</strong> ${exp.location || 'Not found'}</p>
                        <p><strong>Description:</strong> ${exp.description || 'Not found'}</p>
                        ${exp.achievements ? `
                            <div class="achievements">
                                <strong>Achievements:</strong>
                                <ul>
                                    ${exp.achievements.map(achievement => `<li>${achievement}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                `).join('') : '<p>No experience information found</p>'}
            </div>
        </div>

        <div class="cv-section">
            <h2>Skills</h2>
            <div class="info-card">
                ${data.skills ? `
                    <div class="skills-grid">
                        ${Object.entries(data.skills).map(([category, skills]) => `
                            <div class="skill-category">
                                <h3>${category}</h3>
                                <ul>
                                    ${skills.map(skill => `<li>${skill}</li>`).join('')}
                                </ul>
                            </div>
                        `).join('')}
                    </div>
                ` : '<p>No skills information found</p>'}
            </div>
        </div>

        <div class="cv-section">
            <h2>Certifications</h2>
            <div class="info-card">
                ${data.certifications ? data.certifications.map(cert => `
                    <div class="certification-item">
                        <p><strong>Name:</strong> ${cert.name || 'Not found'}</p>
                        <p><strong>Issuer:</strong> ${cert.issuer || 'Not found'}</p>
                        <p><strong>Date:</strong> ${cert.date || 'Not found'}</p>
                        <p><strong>Description:</strong> ${cert.description || 'Not found'}</p>
                    </div>
                `).join('') : '<p>No certifications found</p>'}
            </div>
        </div>

        <div class="cv-section">
            <h2>Projects</h2>
            <div class="info-card">
                ${data.projects ? data.projects.map(project => `
                    <div class="project-item">
                        <p><strong>Name:</strong> ${project.name || 'Not found'}</p>
                        <p><strong>Role:</strong> ${project.role || 'Not found'}</p>
                        <p><strong>Duration:</strong> ${project.duration || 'Not found'}</p>
                        <p><strong>Description:</strong> ${project.description || 'Not found'}</p>
                        ${project.technologies ? `
                            <div class="technologies">
                                <strong>Technologies:</strong>
                                <ul>
                                    ${project.technologies.map(tech => `<li>${tech}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                `).join('') : '<p>No projects found</p>'}
            </div>
        </div>
    `;
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
                            <h3>${category.charAt(0).toUpperCase() + category.slice(1)} Skills</h3>
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
  