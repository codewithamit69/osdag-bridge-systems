import React from "react";
import { motion } from "framer-motion";
import { PlotCard } from "./PlotCard";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function PlotGrid({ plots }) {
  if (!plots) return null;

  const items = [
    { key: "sfd", title: "Shear Force (SFD)" },
    { key: "bmd", title: "Bending Moment (BMD)" },
    { key: "deflection", title: "Deflection" },
    { key: "stress", title: "Stress" },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 xl:grid-cols-2 gap-6"
    >
      {items.map((it) => (
        <motion.div key={it.key} variants={itemVariants}>
          <PlotCard title={it.title} plotlySpec={plots?.[it.key]?.plotly} />
        </motion.div>
      ))}
    </motion.div>
  );
}

