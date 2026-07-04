import React, { useState } from "react";
import { motion } from "framer-motion";
import { FridgeMateHeader } from "../mycomponents/navbar";
import { FiMail, FiPhone, FiMapPin } from "react-icons/fi";
import FridgeMateFooter from "../mycomponents/footer";
import messageImg from "../assets/new-message.png"; // your messaging PNG

export default function ContactPage(): React.JSX.Element {
  const [formData, setFormData] = useState({
    first: "",
    last: "",
    email: "",
    message: "",
  });

  // RESET FORM FUNCTION
  const resetForm = () => {
    setFormData({ first: "", last: "", email: "", message: "" });
  };

  // HANDLE FORM CHANGE
  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // HANDLE FORM SUBMIT
  const handleSubmit = (e: any) => {
    e.preventDefault();
    resetForm();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fffdfa] to-[#fff3e8] p-6 text-gray-800">
      <FridgeMateHeader />

      {/* HEADER */}
      <div className="text-center mt-8">
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl md:text-4xl font-bold text-orange-600"
        >
          Contact Us
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-gray-600 mt-2 max-w-md mx-auto text-sm md:text-base"
        >
          Have questions or feedback? Send us a message and we'll get back to you
          promptly.
        </motion.p>
      </div>

      {/* MAIN SECTION */}
      <div className="mt-10 max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-8">
        
        {/* LEFT IMAGE — FADE UP ONLY */}
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="md:w-1/2 flex justify-start -ml-8"
        >
          <motion.img
            src={messageImg}
            alt="Messaging"
            className="w-72 md:w-96"
            animate={{ y: [0, -7, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatType: "loop" }}
          />
        </motion.div>

        {/* FORM — FADE UP ONLY */}
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, ease: "easeOut" }}
          whileHover={{ scale: 1.03 }}
          className="md:w-1/3 bg-white rounded-3xl shadow-xl p-6 md:p-8 flex-1"
        >
          <form className="flex flex-col gap-3 text-sm" onSubmit={handleSubmit}>
            <input
              type="text"
              name="first"
              value={formData.first}
              onChange={handleChange}
              placeholder="First Name"
              className="border border-orange-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-orange-400 outline-none transition-all duration-200 hover:shadow-sm"
            />
            <input
              type="text"
              name="last"
              value={formData.last}
              onChange={handleChange}
              placeholder="Last Name"
              className="border border-orange-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-orange-400 outline-none transition-all duration-200 hover:shadow-sm"
            />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Your Email"
              className="border border-orange-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-orange-400 outline-none transition-all duration-200 hover:shadow-sm"
            />

            {/* MESSAGE BOX — EDITABLE NOW */}
            <textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              placeholder="Your Message"
              rows={7}
              className="border border-orange-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-orange-400 outline-none bg-gray-50 resize-none"
            ></textarea>

            <motion.button
              type="submit"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm md:text-base font-semibold py-2 rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
            >
              Send Message
            </motion.button>
          </form>
        </motion.div>
      </div>

      {/* CONTACT INFO CARDS */}
      <div className="mt-12 flex flex-col md:flex-row justify-around gap-6 max-w-5xl mx-auto">
        {[
          { icon: <FiMail />, text: "support@fridgemate.com" },
          { icon: <FiPhone />, text: "+91 98765 43210" },
          { icon: <FiMapPin />, text: "New Delhi, India" },
        ].map((item, idx) => (
          <motion.div
            key={idx}
            whileHover={{ scale: 1.03 }}
            transition={{ type: "spring", stiffness: 100 }}
            className="flex flex-col items-center gap-3 p-4 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-200 w-full md:w-1/3 bg-white h-40"
          >
            <div className="bg-orange-500 p-4 rounded-full flex items-center justify-center shadow-md">
              {React.cloneElement(item.icon, { className: "w-6 h-6 text-white" })}
            </div>

            <p className="text-gray-700 text-sm md:text-base text-center">{item.text}</p>
          </motion.div>
        ))}
      </div>

      <FridgeMateFooter />
    </div>
  );
}


