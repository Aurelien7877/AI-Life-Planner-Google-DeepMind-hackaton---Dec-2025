
import React from 'react';

const BackgroundBubbles: React.FC = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* 
        Creating "Glossy 3D" effect using CSS Radial Gradients 
        Palette: #9CC6DB (Blue), #FCF6D9 (Cream), #CF4B00 (Rust), #DDBA7D (Sand)
      */}

      {/* 1. Large Hero Sphere (Rust/Sand) - Top Right */}
      <div 
        className="absolute top-[-50px] right-[-50px] w-[400px] h-[400px] rounded-full"
        style={{
          background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9) 0%, #DDBA7D 20%, #CF4B00 60%, #5a1a00 100%)',
          boxShadow: '0 20px 50px rgba(207, 75, 0, 0.3)'
        }}
      />

      {/* 2. Medium Sphere (Blue/Cream) - Top Left Center */}
      <div 
        className="absolute top-[10%] left-[15%] w-[180px] h-[180px] rounded-full"
        style={{
          background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.95) 0%, #9CC6DB 25%, #4a7c96 80%, #1e3a4a 100%)',
          boxShadow: '0 15px 35px rgba(156, 198, 219, 0.4)'
        }}
      />

      {/* 3. Small Sphere (Cream/Gold) - Near Title */}
      <div 
        className="absolute top-[28%] left-[45%] w-[80px] h-[80px] rounded-full"
        style={{
          background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,1) 0%, #FCF6D9 40%, #DDBA7D 100%)',
          boxShadow: '0 8px 20px rgba(221, 186, 125, 0.3)'
        }}
      />

      {/* 4. Large Floating Sphere (Blue/Purple/Rust Mix) - Bottom Left */}
      <div 
        className="absolute bottom-[5%] left-[-50px] w-[350px] h-[350px] rounded-full"
        style={{
          background: 'radial-gradient(circle at 40% 40%, rgba(255,255,255,0.8) 0%, #9CC6DB 30%, #CF4B00 100%)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.1)'
        }}
      />

      {/* 5. Tiny Accent Bubble - Right Center */}
      <div 
        className="absolute top-[45%] right-[20%] w-[50px] h-[50px] rounded-full"
        style={{
          background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9) 0%, #CF4B00 50%, #8a2be2 100%)', // Adding a hint of purple for iridescence
          boxShadow: '0 5px 15px rgba(0,0,0,0.1)'
        }}
      />

      {/* 6. Bottom Right Medium (Sand/Blue) */}
      <div 
        className="absolute bottom-[20%] right-[10%] w-[200px] h-[200px] rounded-full"
        style={{
          background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8) 0%, #FCF6D9 20%, #9CC6DB 80%)',
          boxShadow: '0 15px 40px rgba(0,0,0,0.05)'
        }}
      />

      {/* Ambient Blur for Depth */}
      <div 
        className="absolute top-[50%] left-[50%] transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-30 pointer-events-none"
        style={{
            background: 'radial-gradient(circle, rgba(252, 246, 217, 0.5) 0%, rgba(156, 198, 219, 0.2) 50%, transparent 80%)',
            filter: 'blur(80px)'
        }}
      />
    </div>
  );
};

export default BackgroundBubbles;
