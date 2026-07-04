// FridgeMateHome.tsx
import React from "react";
import { FridgeMateHeader } from "../mycomponents/navbar";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import FridgeMateFooter from "../mycomponents/footer";

// CHEFS PNG
import ladiesCooking from "../assets/chef.png";

// INGREDIENT ICONS
import milk from "../assets/milk.png";
import egg from "../assets/egg.png";
import bread from "../assets/baguette.png";
import cheese from "../assets/cheese.png";
import tomato from "../assets/tomato.png";
import carrot from "../assets/carrot.png";

// STEAM WEBM
import steam from "../assets/Fumaa.webm";

export default function FridgeMateHome(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fffdfa] to-[#fff6ee] 
                    p-6 flex flex-col items-center text-gray-800 relative">
      <FridgeMateHeader />

      {/* FULL SCREEN BOTTOM STEAM */}
      <div className="fixed bottom-0 left-0 w-full h-[60vh] pointer-events-none overflow-visible z-[1]">
        {[
        "2%", "14%", "26%", "38%",
        "50%", "62%", "74%", "86%", "98%",
        ].map((left, index) => (
        <motion.video
        key={index}
        src={steam}
        autoPlay
        loop
        muted
        playsInline
        className="absolute opacity-50"
        style={{
          width: "150px",
          left: left,
          bottom: "-40px",
        }}
        animate={{
          y: [0, -(350 + Math.random() * 150)],
          opacity: [0, 0.9, 0.7, 0.4, 0.2, 0],   // ⭐ slow fade
        }}
        transition={{
          repeat: Infinity,
          duration: 7 + Math.random() * 4,       // ⭐ slower movement
          delay: Math.random() * 2.5,
          ease: "easeOut",
        }}
        />
        ))}

      </div>


      {/* HERO SECTION */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-6xl mt-20 grid grid-cols-1 md:grid-cols-2 
                   items-center gap-10"
      >
        {/* LEFT SIDE */}
        <div className="flex flex-col items-start text-left px-2 md:pl-0 -ml-4 md:-ml-10">

          {/* BRAND NAME */}
          <h1 className="text-6xl md:text-7xl font-extrabold 
                         text-[#ff6a00] leading-tight tracking-tight drop-shadow-sm">
            FridgeMate
          </h1>

          {/* TAGLINE */}
          <h2 className="text-3xl md:text-4xl font-semibold 
                         text-[#2b2b2b] mt-3 tracking-wide">
            Your Smart Kitchen Assistant
          </h2>

          {/* DESCRIPTION */}
          <p className="text-gray-700 text-xl md:text-2xl mt-6 max-w-xl leading-relaxed">
            Discover delicious recipes using the ingredients already in your kitchen - fast, simple, and AI-powered.
          </p>

          {/* CTA BUTTON */}
          <motion.button
            onClick={() => navigate("/imageUpload")}
            whileHover={{ scale: 1.07 }}
            whileTap={{ scale: 0.95 }}
            className="mt-10 px-12 py-4 bg-gradient-to-r from-[#ff7a1a] to-[#ff6a00]
                       text-white text-xl md:text-2xl font-semibold
                       rounded-2xl shadow-xl shadow-orange-300/40
                       hover:from-[#ff6a00] hover:to-[#e65c00]
                       transition-all"
          >
            Get Started →
          </motion.button>
        </div>

        {/* RIGHT — CHEFS PNG + FLOATING INGREDIENTS */}
        <div className="relative flex justify-center items-center">

          {/* Soft Glow Behind PNG */}
          <div className="absolute w-80 h-80 rounded-full bg-orange-200 blur-3xl opacity-20" />

          {/* Chef PNG */}
          <motion.img
            src={ladiesCooking}
            className="w-96 md:w-[28rem] z-10 drop-shadow-xl relative"
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          />

          {/* =============================================================== */}
          {/*    FLOATING INGREDIENTS (unchanged, still random + natural)    */}
          {/* =============================================================== */}

          <motion.img
            src={milk}
            className="w-10 absolute -top-10 left-2 z-20 drop-shadow-lg"
            animate={{ y: [0, -15, 0], x: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 3.2, ease: "easeInOut" }}
          />

          <motion.img
            src={egg}
            className="w-9 absolute -top-4 right-4 z-20 drop-shadow-lg"
            animate={{ y: [0, -12, 0], x: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
          />

          <motion.img
            src={carrot}
            className="w-10 absolute top-24 -left-10 z-20 drop-shadow-lg"
            animate={{ y: [0, -12, 0], x: [0, 4, 0] }}
            transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut" }}
          />

          <motion.img
            src={bread}
            className="w-10 absolute top-28 right-0 z-20 drop-shadow-lg"
            animate={{ y: [0, -10, 0], x: [0, -5, 0] }}
            transition={{ repeat: Infinity, duration: 3.9, ease: "easeInOut" }}
          />

          <motion.img
            src={cheese}
            className="w-10 absolute bottom-2 left-12 z-20 drop-shadow-lg"
            animate={{ y: [0, -18, 0], x: [0, 5, 0] }}
            transition={{ repeat: Infinity, duration: 4.1, ease: "easeInOut" }}
          />

          <motion.img
            src={tomato}
            className="w-10 absolute bottom-8 right-12 z-20 drop-shadow-lg"
            animate={{ y: [0, -22, 0], x: [0, -3, 0] }}
            transition={{ repeat: Infinity, duration: 2.7, ease: "easeInOut" }}
          />
        </div>
      </motion.section>

      <FridgeMateFooter />
    </div>
  );
}

