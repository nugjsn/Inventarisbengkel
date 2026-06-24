import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';

const CompressData = () => {
    const { tools, updateTool } = useInventory();
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('Idle');
    const [log, setLog] = useState([]);

    const addLog = (msg) => setLog(prev => [...prev, msg]);

    const compressImage = (base64Str) => {
        return new Promise((resolve) => {
            if (!base64Str || !base64Str.startsWith('data:image')) {
                resolve(base64Str);
                return;
            }

            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 800;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                let quality = 0.7;
                let dataUrl = canvas.toDataURL('image/jpeg', quality);
                
                let base64Length = dataUrl.length - (dataUrl.indexOf(',') + 1);
                let sizeInBytes = (base64Length * 3) / 4;
                
                while (sizeInBytes > 100 * 1024 && quality > 0.1) {
                    quality -= 0.1;
                    dataUrl = canvas.toDataURL('image/jpeg', quality);
                    base64Length = dataUrl.length - (dataUrl.indexOf(',') + 1);
                    sizeInBytes = (base64Length * 3) / 4;
                }
                
                resolve(dataUrl);
            };
            img.src = base64Str;
        });
    };

    const startCompression = async () => {
        setStatus('Compressing...');
        setLog([]);
        let processed = 0;
        for (const tool of tools) {
            if (tool.image) {
                // Check size roughly
                const base64Length = tool.image.length - (tool.image.indexOf(',') + 1);
                const sizeInBytes = (base64Length * 3) / 4;
                
                if (sizeInBytes > 100 * 1024) {
                    addLog(`Compressing ${tool.name}... (Old size: ${(sizeInBytes/1024).toFixed(1)} KB)`);
                    const newImage = await compressImage(tool.image);
                    const newLength = newImage.length - (newImage.indexOf(',') + 1);
                    const newSize = (newLength * 3) / 4;
                    
                    if (newSize < sizeInBytes) {
                        await updateTool(tool.id, { ...tool, image: newImage });
                        addLog(`Done ${tool.name}. New size: ${(newSize/1024).toFixed(1)} KB`);
                    } else {
                        addLog(`Skipped ${tool.name}. Could not compress further.`);
                    }
                } else {
                    addLog(`Skipped ${tool.name} (${(sizeInBytes/1024).toFixed(1)} KB) - Already small.`);
                }
            }
            processed++;
            setProgress(Math.round((processed / tools.length) * 100));
        }
        setStatus('Finished!');
    };

    return (
        <div className="card" style={{ maxWidth: '600px', margin: '20px auto' }}>
            <h2>Database Image Compressor</h2>
            <p>Fitur ini akan memproses semua gambar di database Anda yang berukuran &gt; 100KB, dan mengompresnya secara otomatis.</p>
            <p>Total Tools in Database: {tools.length}</p>
            <button className="btn btn-primary" onClick={startCompression} disabled={status === 'Compressing...'}>
                Start Compression
            </button>
            <div style={{ marginTop: '20px' }}>
                <p>Status: {status}</p>
                <div style={{ width: '100%', backgroundColor: 'var(--bg-hover)', height: '20px', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ width: `${progress}%`, backgroundColor: 'var(--accent-success)', height: '100%', transition: 'width 0.3s' }}></div>
                </div>
            </div>
            <div style={{ marginTop: '20px', maxHeight: '300px', overflowY: 'auto', backgroundColor: 'var(--bg-hover)', padding: '10px', borderRadius: '5px', fontSize: '0.9rem' }}>
                {log.map((l, i) => <div key={i}>{l}</div>)}
            </div>
        </div>
    );
};

export default CompressData;
