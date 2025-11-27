import React, { useState } from 'react';
import axios from 'axios';
import { UploadCloud, CheckCircle, XCircle } from 'lucide-react'; // Example icons

// NOTE: This URL must match your running FastAPI server and the specific POST endpoint path
const API_BASE_URL = "http://localhost:8000/api/v1/emissions"; 

// This component is passed 'onUploadSuccess' from the Dashboard to refresh data after upload
const CsvUploadTool = ({ onUploadSuccess }) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadStatus, setUploadStatus] = useState({ message: 'Ready to upload summary CSV.', type: 'initial' });
    const [isUploading, setIsUploading] = useState(false);

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file && file.name.endsWith('.csv')) {
            setSelectedFile(file);
            setUploadStatus({ message: `Selected: ${file.name}`, type: 'initial' });
        } else {
            setSelectedFile(null);
            setUploadStatus({ message: 'Please select a valid .csv file.', type: 'error' });
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        setIsUploading(true);
        setUploadStatus({ message: 'Uploading and processing data...', type: 'pending' });

        const formData = new FormData();
        // The key 'file' must match the parameter name in your FastAPI endpoint!
        formData.append('file', selectedFile);

        try {
            const response = await axios.post(
                `${API_BASE_URL}/upload/`,
                formData,
                {
                    headers: {
                        // Axios sets multipart/form-data automatically, but good practice to know it's being used
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );

            setUploadStatus({ 
                message: `Success! ${response.data.data.inserted_count} records updated. Refreshing charts...`, 
                type: 'success' 
            });
            
            // CRUCIAL: Call the parent function to trigger a data refresh on the dashboard
            onUploadSuccess(); 

        } catch (error) {
            const detail = error.response?.data?.detail || error.message;
            setUploadStatus({ 
                message: `Upload Failed: ${detail}`, 
                type: 'error' 
            });
        } finally {
            setIsUploading(false);
            // Clear the file selection
            setSelectedFile(null);
            document.getElementById('csv-upload-input').value = null;
        }
    };

    const getStatusIcon = (type) => {
        switch (type) {
            case 'success': return <CheckCircle className="text-green-400" size={16} />;
            case 'error': return <XCircle className="text-red-400" size={16} />;
            case 'pending': return <span className="animate-spin">⚙️</span>;
            default: return <UploadCloud className="text-slate-400" size={16} />;
        }
    };

    const statusColor = uploadStatus.type === 'error' ? 'text-red-400' : (uploadStatus.type === 'success' ? 'text-green-400' : 'text-slate-300');

    return (
        <div className="bg-slate-500/10 backdrop-blur-xl border border-slate-400/20 rounded-2xl shadow-lg p-6 flex flex-col gap-4">
            <h3 className="text-lg font-semibold text-slate-300">Update Data Source</h3>
            
            <div className="flex items-center gap-3">
                <input 
                    type="file" 
                    id="csv-upload-input"
                    accept=".csv"
                    onChange={handleFileChange} 
                    className="text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-500/20 file:text-blue-300 hover:file:bg-blue-500/30"
                    disabled={isUploading}
                />
                
                <button 
                    onClick={handleUpload} 
                    disabled={isUploading || !selectedFile}
                    className="px-4 py-2 bg-purple-600 rounded-lg text-white font-semibold hover:bg-purple-700 transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed"
                >
                    {isUploading ? 'Uploading...' : 'Process CSV'}
                </button>
            </div>
            
            <div className={`text-sm ${statusColor} flex items-center gap-2`}>
                {getStatusIcon(uploadStatus.type)}
                <span>{uploadStatus.message}</span>
            </div>
        </div>
    );
};

export default CsvUploadTool; // <-- CRITICAL FIX: Provides the default export