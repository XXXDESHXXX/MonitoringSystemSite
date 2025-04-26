import React from 'react';
import { motion } from 'framer-motion';
import { FaStar, FaRegStar } from 'react-icons/fa';
import './StarToggle.css';

export default function StarToggle({ isOn, onToggle }) {
  return (
    <motion.div
      className={`star-toggle${isOn ? ' on' : ''}`}
      onClick={onToggle}
      animate={{ scale: isOn ? [1, 1.3, 1] : [1, 0.8, 1] }}
      transition={{ duration: 0.3 }}
    >
      {isOn ? <FaStar /> : <FaRegStar />}
    </motion.div>
  );
}
