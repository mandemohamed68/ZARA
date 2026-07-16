/**
 * Helper to upload files to the server, or fallback to base64 if offline/error.
 */
export async function uploadImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Str = reader.result as string;
      
      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filename: file.name,
            base64: base64Str
          })
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.url) {
            resolve(result.url);
            return;
          }
        }
      } catch (err) {
        console.warn('Backend upload server not accessible or errored. Falling back to local Base64 storage.', err);
      }
      
      // Fallback to storing the raw Base64 data url directly in state!
      resolve(base64Str);
    };
    
    reader.onerror = () => {
      resolve('');
    };
    
    reader.readAsDataURL(file);
  });
}
