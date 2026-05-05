import React, { useState, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, User, Hash, CheckCircle, Loader2, Sparkles, FileSpreadsheet, Upload, FileCheck, Layers, FolderOpen } from 'lucide-react';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';

function App() {
  const [mode, setMode] = useState('single'); // 'single' or 'bulk'
  const [formData, setFormData] = useState({
    name: '',
    gender: 'M',
    sr_no: '',
    template: ''
  });
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkData, setBulkData] = useState([]);
  const [bulkSrNo, setBulkSrNo] = useState('1');
  const [outputDir, setOutputDir] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef(null);

  React.useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await axios.get('/api/templates');
        setTemplates(response.data);
        if (response.data.length > 0) {
          setFormData(prev => ({ ...prev, template: response.data[0] }));
        }
      } catch (error) {
        console.error('Error fetching templates:', error);
      }
    };
    fetchTemplates();
  }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBulkFile(file);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      setBulkData(data);
    };
    reader.readAsBinaryString(file);
  };

  const handleSelectFolder = async () => {
    try {
      const handle = await window.showDirectoryPicker();
      setOutputDir(handle);
    } catch (err) {
      console.error('Directory picker failed:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    if (mode === 'single') {
      try {
        const response = await axios.post('/api/generate', formData, {
          responseType: 'blob'
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${formData.name.replace(/\s+/g, '_')}_Certificate.pdf`);
        document.body.appendChild(link);
        link.click();
        
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch (error) {
        console.error('Error:', error);
        alert('Failed to generate. Ensure backend is running.');
      } finally {
        setLoading(false);
      }
    } else {
      if (bulkData.length === 0) {
        alert('Please upload a valid Excel file first.');
        setLoading(false);
        return;
      }

      setProgress({ current: 0, total: bulkData.length });
      
      const incrementSrNo = (str, offset) => {
        const match = str.match(/^(.*?)(\d+)$/);
        if (!match) return str;
        const prefix = match[1];
        const numStr = match[2];
        const nextNum = parseInt(numStr) + offset;
        return prefix + nextNum.toString().padStart(numStr.length, '0');
      };

      try {
        if (outputDir) {
          // Sequential processing is more stable for file handles
          for (let i = 0; i < bulkData.length; i++) {
            const row = bulkData[i];
            const name = (row.Name || row.name || 'Participant').toString();
            const sr_no = (row['Sr No'] || row.sr_no || incrementSrNo(bulkSrNo, i)).toString();
            
            const genderRaw = (row.Gender !== undefined ? row.Gender : row.gender || 'M').toString().trim();
            let genderFinal = 'M';
            if (genderRaw === '1') genderFinal = 'M';
            else if (genderRaw === '0') genderFinal = 'F';
            else genderFinal = genderRaw.toUpperCase().charAt(0);

            const payload = {
              name: name,
              gender: genderFinal,
              sr_no: sr_no,
              template: formData.template
            };

            try {
              const response = await axios.post('/api/generate', payload, {
                responseType: 'blob',
                timeout: 30000 // 30s timeout per certificate
              });

              // Unique filename using Serial Number + Name
              const safeName = name.replace(/[^a-z0-9]/gi, '_');
              const fileName = `${sr_no.replace(/[^a-z0-9]/gi, '_')}_${safeName}.pdf`;
              
              const fileHandle = await outputDir.getFileHandle(fileName, { create: true });
              const writable = await fileHandle.createWritable();
              await writable.write(response.data);
              await writable.close();
              
              setProgress(prev => ({ ...prev, current: i + 1 }));
            } catch (innerErr) {
              console.error(`Error at entry ${i + 1}:`, innerErr);
              // Continue with next instead of crashing whole process
            }
          }
        } else {
          // Fallback to ZIP
          const zip = new JSZip();
          for (let i = 0; i < bulkData.length; i++) {
            const row = bulkData[i];
            const name = (row.Name || row.name || 'Participant').toString();
            const sr_no = (row['Sr No'] || row.sr_no || incrementSrNo(bulkSrNo, i)).toString();
            
            const genderRaw = (row.Gender !== undefined ? row.Gender : row.gender || 'M').toString().trim();
            let genderFinal = 'M';
            if (genderRaw === '1') genderFinal = 'M';
            else if (genderRaw === '0') genderFinal = 'F';
            else genderFinal = genderRaw.toUpperCase().charAt(0);

            const payload = {
              name: name,
              gender: genderFinal,
              sr_no: sr_no,
              template: formData.template
            };

            const response = await axios.post('/api/generate', payload, {
              responseType: 'blob'
            });
            
            const safeName = name.replace(/[^a-z0-9]/gi, '_');
            zip.file(`${sr_no}_${safeName}.pdf`, response.data);
            setProgress(prev => ({ ...prev, current: i + 1 }));
          }
          const content = await zip.generateAsync({ type: "blob" });
          const url = window.URL.createObjectURL(content);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `Certificates_Bulk.zip`);
          document.body.appendChild(link);
          link.click();
        }

        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setProgress({ current: 0, total: 0 });
        }, 3000);
      } catch (error) {
        console.error('Bulk Error:', error);
        alert(`Bulk generation failed at entry ${progress.current + 1}. Check console for details.`);
      } finally {
        setLoading(false);
      }
    }
  };

  const templateNames = {
    'gem_training_direct.pdf': 'Direct Order Certificate',
    'gem_training_intro.pdf': 'Introduction Certificate',
    'gem_training_tender.pdf': 'Tendering Certificate'
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="container"
    >
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 5, repeat: Infinity }}
          style={{ display: 'inline-block' }}
        >
          <Sparkles color="#6366f1" size={32} />
        </motion.div>
        <h1>GeM Certificate Generator</h1>
        <p className="subtitle">Professional Edition</p>
      </div>

      <div className="mode-toggle">
        <button 
          type="button"
          className={`mode-btn ${mode === 'single' ? 'active' : ''}`}
          onClick={() => setMode('single')}
        >
          <User size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
          Single
        </button>
        <button 
          type="button"
          className={`mode-btn ${mode === 'bulk' ? 'active' : ''}`}
          onClick={() => setMode('bulk')}
        >
          <Layers size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
          Bulk Mode
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Certificate Template</label>
          <select
            value={formData.template}
            onChange={(e) => setFormData({ ...formData, template: e.target.value })}
            required
          >
            {templates.map(tmp => (
              <option key={tmp} value={tmp}>
                {templateNames[tmp] || tmp}
              </option>
            ))}
          </select>
        </div>

        <AnimatePresence mode="wait">
          {mode === 'single' ? (
            <motion.div
              key="single"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
            >
              <div className="form-group">
                <label><User size={14} style={{ marginRight: '4px' }} /> Participant Name</label>
                <input
                  type="text"
                  placeholder="Enter full name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required={mode === 'single'}
                />
              </div>

              <div className="form-group">
                <label>Gender Selection</label>
                <div className="gender-options">
                  <button
                    type="button"
                    className={`gender-btn ${formData.gender === 'M' ? 'active' : ''}`}
                    onClick={() => setFormData({ ...formData, gender: 'M' })}
                  >
                    Male (Mr.)
                  </button>
                  <button
                    type="button"
                    className={`gender-btn ${formData.gender === 'F' ? 'active' : ''}`}
                    onClick={() => setFormData({ ...formData, gender: 'F' })}
                  >
                    Female (Ms.)
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label><Hash size={14} style={{ marginRight: '4px' }} /> Serial Number</label>
                <input
                  type="text"
                  placeholder="e.g. 001"
                  value={formData.sr_no}
                  onChange={(e) => setFormData({ ...formData, sr_no: e.target.value })}
                  required={mode === 'single'}
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="bulk"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
            >
              <div 
                className={`upload-area ${bulkFile ? 'has-file' : ''}`}
                onClick={() => fileInputRef.current.click()}
                style={{ marginBottom: '1rem' }}
              >
                <div className="upload-icon">
                  {bulkFile ? <FileCheck size={40} /> : <Upload size={40} />}
                </div>
                <div className="file-info">
                  {bulkFile ? bulkFile.name : 'Click to upload Excel (.xlsx)'}
                </div>
                {bulkData.length > 0 && (
                  <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '4px' }}>
                    {bulkData.length} entries found
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".xlsx, .xls"
                  style={{ display: 'none' }}
                />
              </div>

              <div className="form-group">
                <label><Hash size={14} style={{ marginRight: '4px' }} /> Starting Serial No (Supports Alphanumeric)</label>
                <input
                  type="text"
                  placeholder="e.g. GEM-001"
                  value={bulkSrNo}
                  onChange={(e) => setBulkSrNo(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Output Destination</label>
                <button 
                  type="button" 
                  className={`gender-btn ${outputDir ? 'active' : ''}`}
                  onClick={handleSelectFolder}
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '0.8rem 1rem' }}
                >
                  <FolderOpen size={16} />
                  {outputDir ? `Target: ${outputDir.name}` : 'Select Folder (Direct Save)'}
                </button>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                  * Leave unselected to download as ZIP fallback.
                </p>
              </div>

              <div className="format-note">
                <h4><FileCheck size={14} /> Excel Format Note</h4>
                <p>
                  Required columns: <strong>Name</strong>, <strong>Gender</strong>.<br/>
                  Gender mapping: <strong>1</strong> or <strong>M</strong> = Male, <strong>0</strong> or <strong>F</strong> = Female.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading && progress.total > 0 && (
          <div className="progress-section">
            <div className="progress-container">
              <div 
                className="progress-bar" 
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              ></div>
            </div>
            <div className="progress-text">
              Generating: {progress.current} / {progress.total} completed
            </div>
          </div>
        )}

        <button 
          type="submit" 
          className="generate-btn"
          disabled={loading || (mode === 'bulk' && !bulkFile)}
        >
          {loading ? (
            <Loader2 className="loading" size={20} />
          ) : success ? (
            <CheckCircle size={20} />
          ) : mode === 'bulk' ? (
            <FileSpreadsheet size={20} />
          ) : (
            <Download size={20} />
          )}
          {loading ? 'Processing...' : success ? 'Completed!' : mode === 'bulk' ? 'Process Bulk' : 'Generate Certificate'}
        </button>
      </form>

      <div className="footer">
        Professional Edition • Built by <span>Bhargav Ram Potluri</span>
      </div>
    </motion.div>
  );
}

export default App;
