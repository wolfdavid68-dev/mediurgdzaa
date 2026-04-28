import React from "react";
import DrugCard from "./DrugCard";

const DrugList = ({ drugs, favorites, onToggleFavorite, onOpen }) => {
  return (
    <div>
      {drugs.map((drug) => (
        <DrugCard
          key={drug.id}
          drug={drug}
          isFavorite={favorites?.has(drug.id) || false}
          onToggleFavorite={onToggleFavorite}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
};

export default DrugList;
