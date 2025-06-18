import React, { useState } from 'react';
import './App.css';
import logo from './logo.png';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun } from 'docx';

function App() {
  const [resume, setResume] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [resumeOutput, setResumeOutput] = useState('');
  const [coverOutput, setCoverOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [template, setTemplate] = useState('classic');
  const [recipientAddress, setRecipientAddress] = useState('');
  const endpoint = process.env.REACT_APP_API_ENDPOINT;

  const getStyleByTemplate = () => {
    switch (template) {
      case 'classic':
        return { fontFamily: 'Georgia, serif' };
      case 'modern':
        return { fontFamily: 'Arial, sans-serif' };
      case 'multicolumn':
        return { columnCount: 2, columnGap: '2rem', fontFamily: 'Arial, sans-serif' };
      case 'quotation':
        return { background: '#fffbe6', fontStyle: 'italic', fontFamily: 'Georgia, serif', padding: '1rem' };
      default:
        return {};
    }
  };

  const parseSections = (text) => {
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        if (/^\s*(Professional Summary|Work Experience|Education|Skills|Projects):?/i.test(line)) {
          return `<p><strong>${line.replace(/:$/, '')}:</strong></p>`;
        }
        return `<p>${line}</p>`;
      })
      .join('');
  };

  const handleGenerate = async () => {
    if (!resume.trim() || !jobDescription.trim()) {
      alert('Resume and job description are required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume, jobDescription }),
      });
      const data = await response.json();
      const raw = data.result || '';

      if (!raw.includes('Custom Cover Letter:')) {
        alert('Failed to generate resume and cover letter. Please try again or check your input.');
        return;
      }

      const [resumePart, coverPart] = raw.split('Custom Cover Letter:');

      const cleanedResume = resumePart
        .replace(/^.*(Tailored Resume:|Here is a tailored resume.*?)\s*/i, '')
        .trim();

      let cleanedCover = coverPart
        .replace(/\[Insert Name\]|\[Insert job title\]|\[Insert company name\]|\[Insert company address\]/gi, '')
        .replace(/^\s*Dear\s*[:,]?\s*$/gim, '') // Remove standalone 'Dear', 'Dear:', 'Dear ,', etc.
        .replace(/^:\s*$/gm, '') // Remove any standalone colon
        .trim();

      const addressBlock = `[Your Address]
[City, State, Zip Code]
[Email Address]
[Phone Number]

${recipientAddress.trim()}

Dear Hiring Manager,

<strong>APPLICATION FOR EMPLOYMENT</strong>

`;
      setResumeOutput(parseSections(cleanedResume));
      setCoverOutput(parseSections(addressBlock + cleanedCover));
    } catch (err) {
      alert('Error generating content. Please check your input.');
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = (htmlContent, filename) => {
    const container = document.createElement('div');
    container.innerHTML = htmlContent;
    Object.assign(container.style, {
      fontFamily: 'Arial',
      fontSize: '14px',
      width: '800px',
      padding: '1rem'
    });
    document.body.appendChild(container);

    html2canvas(container).then(canvas => {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210;
      const imgHeight = canvas.height * imgWidth / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(filename);
      document.body.removeChild(container);
    });
  };

  const downloadDOCX = (htmlContent, filename) => {
    const plain = htmlContent.replace(/<\/?[^>]+(>|$)/g, '');
    const lines = plain.split('\n').filter(l => l.trim());
    const doc = new Document({
      sections: [{
        children: lines.map(line =>
          new Paragraph({
            children: [
              new TextRun({
                text: line,
                bold: /^[A-Z][A-Za-z\s]+:$/.test(line) || line === 'APPLICATION FOR EMPLOYMENT',
                font: 'Arial',
                size: 24
              })
            ]
          })
        ),
      }]
    });
    Packer.toBlob(doc).then(blob => saveAs(blob, filename));
  };

  const templates = [
    { id: 'classic', label: 'Classic', img: '/thumb-classic.png' },
    { id: 'modern', label: 'Modern', img: '/thumb-modern.png' },
    { id: 'multicolumn', label: 'Multicolumn', img: '/thumb-multicolumn.png' },
    { id: 'quotation', label: 'Quotation', img: '/thumb-quotation.png' }
  ];

  return (
    <div className="App">
      <img src={logo} alt="TailorCV Logo" className="logo" />
      <p className="subtitle">Your Resume and Cover Letter Assistant</p>

      <div className="template-preview-grid">
        {templates.map(t => (
          <div
            key={t.id}
            className={`template-thumb ${template === t.id ? 'selected' : ''}`}
            onClick={() => setTemplate(t.id)}
          >
            <img src={t.img} alt={t.label} />
            <span>{t.label}</span>
          </div>
        ))}
      </div>

      <textarea
        placeholder="Paste your resume here..."
        rows="8"
        value={resume}
        onChange={(e) => setResume(e.target.value)}
      />
      <textarea
        placeholder="Paste the job description here..."
        rows="8"
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
      />
      <textarea
        placeholder="Paste recipient address here..."
        rows="4"
        value={recipientAddress}
        onChange={(e) => setRecipientAddress(e.target.value)}
      />
      <button onClick={handleGenerate} disabled={loading}>
        {loading ? 'Generating...' : 'Generate Tailored Resume & Cover Letter'}
      </button>

      {resumeOutput && (
        <div className="result">
          <h3>Resume Preview</h3>
          <div className="output" style={getStyleByTemplate()} dangerouslySetInnerHTML={{ __html: resumeOutput }} />
          <div className="btn-group">
            <button onClick={() => downloadPDF(resumeOutput, 'Tailored_Resume.pdf')}>Download Resume PDF</button>
            <button onClick={() => downloadDOCX(resumeOutput, 'Tailored_Resume.docx')}>Download Resume DOCX</button>
          </div>

          <h3>Cover Letter Preview</h3>
          <div className="output" style={{ fontFamily: 'Georgia', textAlign: 'justify' }} dangerouslySetInnerHTML={{ __html: coverOutput }} />
          <div className="btn-group">
            <button onClick={() => downloadPDF(coverOutput, 'Cover_Letter.pdf')}>Download Cover Letter PDF</button>
            <button onClick={() => downloadDOCX(coverOutput, 'Cover_Letter.docx')}>Download Cover Letter DOCX</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;