import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const supabaseUrl = 'https://claovzlxzpledlrypoas.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsYW92emx4enBsZWRscnlwb2FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NjM4OTcsImV4cCI6MjA4NjUzOTg5N30.5aVQMQNlQLhma6GMEOeN6OKQH3ST8qefD9J5WHQ2dhE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('Fetching tool IDs from Supabase...');
    // Only fetch IDs first so we don't overload memory or network
    const { data: tools, error } = await supabase.from('tools').select('id, name');
    
    if (error) {
        console.error('Error fetching tools:', error);
        return;
    }
    
    console.log(`Found ${tools.length} tools. Processing one by one...`);
    for (const tool of tools) {
        try {
            const { data: toolData } = await supabase.from('tools').select('image').eq('id', tool.id).single();
            if (toolData && toolData.image && toolData.image.startsWith('data:image')) {
                const base64Str = toolData.image;
                const base64Length = base64Str.length - (base64Str.indexOf(',') + 1);
                const sizeInBytes = (base64Length * 3) / 4;
                
                if (sizeInBytes > 100 * 1024) {
                    console.log(`[${tool.name}] Compressing... (Old size: ${(sizeInBytes/1024).toFixed(1)} KB)`);
                    const base64Data = base64Str.split(',')[1];
                    const buffer = Buffer.from(base64Data, 'base64');
                    
                    // Resize to max 800x800 and compress using sharp
                    const compressedBuffer = await sharp(buffer)
                        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
                        .jpeg({ quality: 70 })
                        .toBuffer();
                    
                    const compressedBase64 = `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`;
                    const newSize = compressedBuffer.length;
                    
                    if (newSize < sizeInBytes) {
                        await supabase.from('tools').update({ image: compressedBase64 }).eq('id', tool.id);
                        console.log(`[${tool.name}] Done! New size: ${(newSize/1024).toFixed(1)} KB`);
                    } else {
                        console.log(`[${tool.name}] Could not compress further.`);
                    }
                } else {
                    // console.log(`[${tool.name}] Skipped - already small (${(sizeInBytes/1024).toFixed(1)} KB)`);
                }
            }
        } catch (err) {
            console.error(`Failed to process tool ${tool.name} (${tool.id})`, err.message);
        }
    }
    console.log('Database compression finished!');
}

run();
