import React, { useState, useEffect } from 'react';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { TextToSpeech } from '@capacitor-community/text-to-speech';

const LiveAssistant = () => {
  const [text, setText] = useState('Press the button to speak...');
  const [isListening, setIsListening] = useState(false);

  // 1. Ask for permission when the app starts
  useEffect(() => {
    SpeechRecognition.requestPermissions();
  }, []);

  // 2. Function to start listening
  const startListening = async () => {
    // Check if the phone's speech feature is available
    const { available } = await SpeechRecognition.available();
    
    if (available) {
      setIsListening(true);
      setText('Listening...');
      
      // Start the native Android microphone
      SpeechRecognition.start({
        language: "en-US",
        maxResults: 2,
        prompt: "Speak now",
        partialResults: true,
        popup: false,
      });

      // Update the screen as you talk
      SpeechRecognition.addListener('partialResults', (data: any) => {
        if (data.matches && data.matches.length > 0) {
          setText(data.matches[0]);
        }
      });
    } else {
      setText("Speech recognition is not available on this device.");
    }
  };

  // 3. Function to stop listening
  const stopListening = async () => {
    setIsListening(false);
    await SpeechRecognition.stop();
  };

  // 4. Function to make the phone speak back to you
  const speakText = async () => {
    await TextToSpeech.speak({
      text: text,
      lang: 'en-US',
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      category: 'ambient',
    });
  };

  return (
    <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1>Live Assistant</h1>
      
      {/* Display what you said */}
      <div style={{ 
        margin: '20px 0', 
        padding: '15px', 
        border: '1px solid #ddd', 
        borderRadius: '8px', 
        minHeight: '50px',
        backgroundColor: '#f9f9f9'
      }}>
        {text}
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <button 
          onClick={isListening ? stopListening : startListening}
          style={{
            padding: '15px',
            backgroundColor: isListening ? '#ff4444' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '18px',
            fontWeight: 'bold'
          }}
        >
          {isListening ? '🛑 Stop Listening' : '🎤 Start Mic'}
        </button>

        <button 
          onClick={speakText}
          style={{
            padding: '15px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '18px',
            fontWeight: 'bold'
          }}
        >
          🔊 Read Aloud
        </button>
      </div>
    </div>
  );
};

export default LiveAssistant;