import { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Loader2, Image as ImageIcon } from 'lucide-react';

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export function LogoGenerator() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [needsKey, setNeedsKey] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cachedLogo = localStorage.getItem('maple_infinity_logo');
    if (cachedLogo) {
      setLogoUrl(cachedLogo);
    }
  }, []);

  const generateLogo = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
          setNeedsKey(true);
          setIsGenerating(false);
          return;
        }
      }

      // Create a new instance right before making the call to ensure it has the latest key
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: {
          parts: [
            {
              text: 'A highly detailed, futuristic neon glowing maple leaf intertwined with an infinity symbol. Cyberpunk aesthetic, dark background, vibrant cyan and magenta neon lights, 4k resolution, masterpiece, sleek, modern.',
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: '1:1',
            imageSize: '1K',
          },
        },
      });

      let generatedUrl = null;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          generatedUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      if (generatedUrl) {
        setLogoUrl(generatedUrl);
        localStorage.setItem('maple_infinity_logo', generatedUrl);
      } else {
        setError('Failed to generate image. No image data returned.');
      }
    } catch (err: any) {
      console.error('Error generating logo:', err);
      if (err.message?.includes('Requested entity was not found')) {
        setNeedsKey(true);
      } else {
        setError(err.message || 'An error occurred while generating the logo.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setNeedsKey(false);
      generateLogo();
    }
  };

  if (logoUrl) {
    return (
      <div className="relative group rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.2)] border border-cyan-500/40 w-48 h-48 sm:w-64 sm:h-64 mx-auto">
        <img src={logoUrl} alt="Maple Infinity Logo" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
          <button 
            onClick={generateLogo}
            disabled={isGenerating}
            className="px-4 py-2 bg-cyan-500 text-black font-bold rounded-lg hover:bg-cyan-400 transition-colors flex items-center gap-2"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
            Regenerate
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-48 h-48 sm:w-64 sm:h-64 mx-auto rounded-3xl border-2 border-dashed border-cyan-500/50 flex flex-col items-center justify-center p-6 text-center bg-black/40 backdrop-blur-md shadow-[0_0_30px_rgba(0,255,255,0.1)]">
      {needsKey ? (
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-cyan-100">API Key required for high-quality logo generation.</p>
          <button
            onClick={handleSelectKey}
            className="px-4 py-2 bg-cyan-500 text-black font-bold rounded-lg hover:bg-cyan-400 transition-colors shadow-[0_0_15px_rgba(0,255,255,0.5)]"
          >
            Select API Key
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <ImageIcon className="w-10 h-10 text-cyan-500/50" />
          {error ? (
            <p className="text-xs text-red-400">{error}</p>
          ) : (
            <p className="text-sm text-cyan-100">Generate the official Maple Infinity logo</p>
          )}
          <button
            onClick={generateLogo}
            disabled={isGenerating}
            className="px-4 py-2 bg-fuchsia-500 text-white font-bold rounded-lg hover:bg-fuchsia-400 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-[0_0_15px_rgba(255,0,255,0.5)]"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Logo'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
