import React from "react";
import DrugCard from "./DrugCard";

const DrugList = ({ drugs }) => {
  return (
    <div>
      {drugs.map((drug) => (
        <DrugCard key={drug.id} drug={drug} />
      ))}
    </div>
  );
};

export default DrugList;
