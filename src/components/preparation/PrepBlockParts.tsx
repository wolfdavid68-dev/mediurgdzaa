import { InfoIcon, PrepIcon, recipeModeClass, type PrepRecipe } from "../PrepBlock.parts";
import type { Drug } from "../../types/data";

export type PrepBlockProps = {
  drug: Drug;
  weight: string;
  produitFinal?: string;
  prepPopulation?: "adulte" | "enfant" | null;
  includePreviewOverrides?: boolean;
};

export const PrepHeader = ({ tags }: { tags: Array<string | undefined> }) => (
  <div className="prep-head">
    <div className="prep-head-title">
      <PrepIcon />
      Préparation
    </div>
    <div className="prep-tags">
      {tags.filter(Boolean).map((tag) => (
        <span key={tag} className="prep-tag">
          {tag}
        </span>
      ))}
    </div>
  </div>
);

type RecipeSwitchProps = {
  recipes: PrepRecipe[];
  activeIndex: number;
  onSelect: (index: number) => void;
};

export const RecipeSwitch = ({ recipes, activeIndex, onSelect }: RecipeSwitchProps) =>
  recipes.length > 1 ? (
    <div className="prep-mode-switch" role="group" aria-label="Choix de préparation">
      {recipes.map((recipe, index) => (
        <button
          key={recipe.titre}
          type="button"
          className={`prep-mode-option${recipeModeClass(recipe)}${
            index === activeIndex ? " is-active" : ""
          }`}
          aria-pressed={index === activeIndex}
          onClick={() => onSelect(index)}
        >
          <span>{recipe.titre}</span>
          {recipe.tag && <small>{recipe.tag}</small>}
        </button>
      ))}
    </div>
  ) : null;

export const EmptyRecipe = ({ recipe }: { recipe: PrepRecipe }) => (
  <div className={`prep-calc-empty${recipeModeClass(recipe)}`}>
    <div className="prep-calc-header">
      <InfoIcon /> {recipe.titre}
      {recipe.tag && <span style={{ marginLeft: "auto" }}>{recipe.tag}</span>}
    </div>
    <div className="prep-empty-text">{recipe.note || "Préparation à compléter."}</div>
  </div>
);

type PediatricMode = "ivd" | "im" | "pse";

export const PediatricModeSwitch = ({
  activeMode,
  onSelect,
}: {
  activeMode: PediatricMode;
  onSelect: (mode: PediatricMode) => void;
}) => (
  <div className="prep-mode-switch" role="group" aria-label="Choix de préparation pédiatrique">
    <button
      type="button"
      className={`prep-mode-option prep-recipe-ped${activeMode === "ivd" ? " is-active" : ""}`}
      aria-pressed={activeMode === "ivd"}
      onClick={() => onSelect("ivd")}
    >
      <span>IVD ACR</span>
      <small>10 mL</small>
    </button>
    <button
      type="button"
      className={`prep-mode-option prep-recipe-ped-im${activeMode === "im" ? " is-active" : ""}`}
      aria-pressed={activeMode === "im"}
      onClick={() => onSelect("im")}
    >
      <span>IM anaphylaxie</span>
      <small>1 mg/mL pur</small>
    </button>
    <button
      type="button"
      className={`prep-mode-option prep-recipe-pse${activeMode === "pse" ? " is-active" : ""}`}
      aria-pressed={activeMode === "pse"}
      onClick={() => onSelect("pse")}
    >
      <span>PSE</span>
      <small>0,2 mg/mL</small>
    </button>
  </div>
);
