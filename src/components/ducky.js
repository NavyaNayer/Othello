// src/components/Ducky.js
import React from 'react';

const Ducky = ({ type, abilityUsed, onUseAbility }) => {
  const handleClick = () => {
    if (!abilityUsed) {
      onUseAbility();
    }
  };

  return (
    <button onClick={handleClick} disabled={abilityUsed}>
      {type} Ability {abilityUsed ? "(Used)" : ""}
    </button>
  );
};

export default Ducky;
