import { useState, useRef, useEffect } from 'react';
import { CreateMLCEngine } from '@mlc-ai/web-llm';
import Tesseract from 'tesseract.js'; // <-- NEW: Import Tesseract

const SELECTED_MODEL = "Llama-3.2-1B-Instruct-q4f16_1-MLC";

export default function App() {
  const [engine, setEngine] = useState(null);
  const [loadingText, setLoadingText] = useState('Initializing AI...');
  const [isReady, setIsReady] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  
  const engineInitialized = useRef(false);

  useEffect(() => {
    async function initializeEngine() {
      if (engineInitialized.current) return;
      engineInitialized.current = true;

      try {
        const loadedEngine = await CreateMLCEngine(SELECTED_MODEL, {
          initProgressCallback: (progress) => {
            setLoadingText(progress.text);
            if (progress.progress === 1) {
              setIsReady(true);
              setLoadingText('Ready! AI is running locally.');
            }
          }
        });
        setEngine(loadedEngine);
      } catch (error) {
        console.error("Error loading model:", error);
      }
    }
    initializeEngine();
  }, []);

  // --- NEW: Image Upload & OCR Logic ---
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoadingText("Scanning image for text... 🔍");
    setIsReady(false); // Temporarily disable send button

    try {
      // Run OCR locally in the browser
      const result = await Tesseract.recognize(file, 'eng');
      const extractedText = result.data.text.trim();
      
      if (extractedText) {
        setInput(`Please solve this question: \n\n${extractedText}`);
      } else {
        alert("Could not find any readable text in that image.");
      }
    } catch (error) {
      console.error("OCR Error:", error);
    } finally {
      setLoadingText('Ready! AI is running locally.');
      setIsReady(true);
    }
  };
  // -------------------------------------

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !engine) return;

    const newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');
    setMessages((prev) => [...prev, { role: 'assistant', content: '...' }]);

    try {
      const chunks = await engine.chat.completions.create({
        messages: newMessages,
        stream: true,
      });

      let reply = "";
      for await (const chunk of chunks) {
        const delta = chunk.choices[0]?.delta?.content || "";
        reply += delta;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: reply };
          return updated;
        });
      }
    } catch (error) {
      console.error("Chat error:", error);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h1>Offline Browser AI 🧠</h1>
      
      <div style={{ padding: '10px', backgroundColor: isReady ? '#d4edda' : '#fff3cd', borderRadius: '5px', marginBottom: '20px' }}>
        <small>{loadingText}</small>
      </div>

      <div style={{ height: '400px', overflowY: 'auto', border: '1px solid #ccc', padding: '10px', borderRadius: '8px', marginBottom: '10px' }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{ textAlign: msg.role === 'user' ? 'right' : 'left', margin: '10px 0', whiteSpace: 'pre-wrap' }}>
            <span style={{ 
              background: msg.role === 'user' ? '#007bff' : '#f1f1f1', 
              color: msg.role === 'user' ? 'white' : 'black',
              padding: '8px 12px', 
              borderRadius: '15px', 
              display: 'inline-block',
              maxWidth: '80%'
            }}>
              {msg.content}
            </span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            value={input} 
            onChange={(e) => setInput(e.target.value)}
            disabled={!isReady}
            placeholder="Ask something or upload a question..."
            style={{ flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
          />
          <button type="submit" disabled={!isReady} style={{ padding: '10px 20px', cursor: isReady ? 'pointer' : 'not-allowed' }}>
            Send
          </button>
        </div>
        
        {/* NEW: Image Upload Input */}
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleImageUpload} 
          disabled={!isReady}
          style={{ padding: '5px' }}
        />
      </form>
    </div>
  );
}