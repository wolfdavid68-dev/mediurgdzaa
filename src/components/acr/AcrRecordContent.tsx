import type { RefObject } from "react";
import { TimerReset } from "lucide-react";
import {
  ACR_H_CAUSES,
  ACR_RHYTHMS,
  ACR_T_CAUSES,
  formatAcrElapsed,
  formatWallTime,
  type AcrCycleRecord,
  type AcrFullSession,
  type AcrRhythm,
  type AcrTimedEvent,
  type AcrVoie,
} from "../../lib/acrSession";
import {
  CheckOption,
  Chip,
  DESTINATIONS,
  Field,
  parseOptionalNumber,
  Section,
  SIGNE_REVEIL,
  toggleInArray,
  VOIES,
} from "./AcrRecordControls";
import { displayPatient } from "./AcrRecordText";

type AcrRecordContentProps = {
  captureRef: RefObject<HTMLDivElement | null>;
  record: AcrFullSession;
  elapsed: number;
  cycle: number;
  shocks: number;
  adres: number;
  amios: number;
  protocol: string;
  pediatric: boolean;
  themePreference: "dark" | "light";
  timelineEvents: AcrTimedEvent[];
  updateRecord: (mutator: (previous: AcrFullSession) => AcrFullSession) => void;
  updateCycle: (cycleNumber: number, patch: Partial<AcrCycleRecord>) => void;
};

const AcrRecordContent = ({
  captureRef,
  record,
  elapsed,
  cycle,
  shocks,
  adres,
  amios,
  protocol,
  pediatric,
  themePreference,
  timelineEvents,
  updateRecord,
  updateCycle,
}: AcrRecordContentProps) => (
  <div className="acr-record-content" ref={captureRef} data-acr-theme={themePreference}>
    {/* Cartes supérieures : chrono + patient anonyme */}
    <div className="acr-record-topcards">
      <div className="acr-record-timecard">
        <span className="acr-record-time-icon" aria-hidden="true">
          <TimerReset size={34} strokeWidth={2.5} />
        </span>
        <span>Temps écoulé</span>
        <strong>{formatAcrElapsed(elapsed)}</strong>
        <small>Depuis le début de la RCP</small>
      </div>
      <div className="acr-record-patient-card">
        <span>Patient (anonyme)</span>
        <strong>{displayPatient(record)}</strong>
        <div className="acr-record-patient-inline">
          <label>
            <small>Âge</small>
            <div className="acr-record-patient-input-wrap">
              <input
                value={record.patient.age ?? ""}
                placeholder="—"
                onChange={(e) =>
                  updateRecord((prev) => ({
                    ...prev,
                    patient: { ...prev.patient, age: e.currentTarget.value },
                  }))
                }
              />
              <em>ans</em>
            </div>
          </label>
          <label>
            <small>Sexe</small>
            <div className="acr-record-patient-input-wrap">
              <input
                value={record.patient.sexe ?? ""}
                placeholder="M/F"
                onChange={(e) =>
                  updateRecord((prev) => ({
                    ...prev,
                    patient: { ...prev.patient, sexe: e.currentTarget.value },
                  }))
                }
              />
            </div>
          </label>
        </div>
        <em>
          {pediatric ? "Enfant" : "Adulte"} · {protocol === "acls" ? "ACLS" : "ERC"} · Cycle {cycle}
        </em>
      </div>
    </div>

    <div className="acr-record-sections">
      {/* 1. Demande de renfort */}
      <Section title="1. Demande de renfort">
        <div className="acr-record-fields acr-record-fields-two acr-record-compact-fields">
          <Field
            label="Heure de survenue ACR"
            value={record.horaires.survenueAcr}
            placeholder="HH:MM"
            onChange={(value) =>
              updateRecord((prev) => ({
                ...prev,
                horaires: { ...prev.horaires, survenueAcr: value },
              }))
            }
          />
          <Field
            label="Durée no-flow estimée"
            type="number"
            value={record.initial.noFlowMin}
            suffix="min"
            onChange={(value) =>
              updateRecord((prev) => ({
                ...prev,
                initial: { ...prev.initial, noFlowMin: parseOptionalNumber(value) },
              }))
            }
          />
        </div>
      </Section>

      {/* 2. RCP */}
      <Section
        title="2. RCP"
        subtitle="massage sur plan dur, 100–120/min, 5–6 cm, profondeur optimale"
      >
        <div className="acr-record-fields acr-record-compact-fields">
          <Field
            label="Heure de début de la RCP"
            value={record.horaires.debutRcp}
            placeholder="auto"
            onChange={(value) =>
              updateRecord((prev) => ({
                ...prev,
                horaires: { ...prev.horaires, debutRcp: value },
              }))
            }
          />
        </div>
      </Section>

      {/* 3. Première analyse + pose du défibrillateur */}
      <Section title="3. Première analyse + pose du défibrillateur">
        <div className="acr-record-analyse-row">
          <Field
            label="Heure de la 1ère analyse"
            value={record.horaires.premiereAnalyse}
            placeholder="auto"
            onChange={(value) =>
              updateRecord((prev) => ({
                ...prev,
                horaires: { ...prev.horaires, premiereAnalyse: value },
              }))
            }
          />
          <div>
            <div className="acr-record-chip-group" role="group" aria-label="Rythme initial">
              <span className="acr-record-chip-label">Rythme</span>
              {ACR_RHYTHMS.map((rhythm) => (
                <Chip
                  key={rhythm}
                  active={record.initial.rythmeInitial === rhythm}
                  onClick={() =>
                    updateRecord((prev) => ({
                      ...prev,
                      initial: {
                        ...prev.initial,
                        rythmeInitial: rhythm as AcrRhythm,
                      },
                    }))
                  }
                >
                  {rhythm}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* 4. VVP & pronostic */}
      <Section title="4. VVP & pronostic">
        <div className="acr-record-vvp-row">
          <Field
            label="Heure pose VVP"
            value={record.horaires.poseVvp}
            onChange={(value) =>
              updateRecord((prev) => ({
                ...prev,
                horaires: { ...prev.horaires, poseVvp: value },
              }))
            }
          />
          <div>
            <div className="acr-record-chip-group" role="group" aria-label="Voie d'abord VVP">
              <span className="acr-record-chip-label">Voie</span>
              {VOIES.map((voie) => (
                <Chip
                  key={voie}
                  active={record.initial.voieVvp === voie}
                  onClick={() =>
                    updateRecord((prev) => ({
                      ...prev,
                      initial: { ...prev.initial, voieVvp: voie as AcrVoie },
                    }))
                  }
                >
                  {voie}
                </Chip>
              ))}
            </div>
          </div>
        </div>
        <div className="acr-record-fields acr-record-fields-three acr-record-compact-fields">
          <Field
            label="Température"
            value={record.initial.temperature}
            suffix="°C"
            onChange={(value) =>
              updateRecord((prev) => ({
                ...prev,
                initial: { ...prev.initial, temperature: value },
              }))
            }
          />
          <Field
            label="Glycémie"
            value={record.initial.glycemie}
            suffix="g/L"
            onChange={(value) =>
              updateRecord((prev) => ({
                ...prev,
                initial: { ...prev.initial, glycemie: value },
              }))
            }
          />
          <Field
            label="Capnographie initiale"
            value={record.initial.capnoInitiale}
            suffix="mmHg"
            onChange={(value) =>
              updateRecord((prev) => ({
                ...prev,
                initial: { ...prev.initial, capnoInitiale: value },
              }))
            }
          />
        </div>
      </Section>

      {/* 5. Suivi de la réanimation — tableau de cycles */}
      <Section title="5. Suivi de la réanimation" showStatus={false}>
        <div className="acr-record-stats">
          <span>
            <strong>{shocks}</strong> choc{shocks > 1 ? "s" : ""}
          </span>
          <span>
            <strong>{adres}</strong> adré
          </span>
          <span>
            <strong>{amios}</strong> amio
          </span>
          <span>
            <strong>{history.length}</strong> cycle{history.length > 1 ? "s" : ""}
          </span>
        </div>
        {record.cycles.length === 0 ? (
          <div className="acr-record-empty">
            Aucun cycle clos pour l'instant. Les cycles du chrono apparaîtront ici automatiquement.
          </div>
        ) : (
          <div className="acr-record-cycle-table-wrap" role="region" aria-label="Cycles ACR">
            <table className="acr-record-cycle-table">
              <thead>
                <tr>
                  <th>Cycle</th>
                  <th>Rythme</th>
                  <th>Choc</th>
                  <th>Médicaments</th>
                  <th>Voie aérienne</th>
                  <th>Capno</th>
                </tr>
              </thead>
              <tbody>
                {record.cycles.map((item) => (
                  <tr key={item.cycle}>
                    <td className="acr-cycle-num">
                      <strong>Cycle {item.cycle}</strong>
                      <span>T+{formatAcrElapsed(item.t)}</span>
                      {item.wallTime && <em>{item.wallTime}</em>}
                    </td>
                    <td>{item.rhythm || "—"}</td>
                    <td className={item.choc ? "acr-cycle-choc" : ""}>{item.choc || "—"}</td>
                    <td className="acr-cycle-drugs">
                      {item.drogues || item.actions.join(" · ") || "—"}
                      {item.commentaire && (
                        <em className="acr-cycle-comment">{item.commentaire}</em>
                      )}
                    </td>
                    <td>
                      <div className="acr-cycle-input">
                        <input
                          value={item.ventilation ?? ""}
                          placeholder="IOT, BAVU…"
                          onChange={(e) =>
                            updateCycle(item.cycle, {
                              ventilation: e.currentTarget.value,
                            })
                          }
                        />
                      </div>
                    </td>
                    <td>
                      <div className="acr-cycle-input">
                        <input
                          value={item.capno ?? ""}
                          placeholder="—"
                          onChange={(e) =>
                            updateCycle(item.cycle, { capno: e.currentTarget.value })
                          }
                        />
                        <em>mmHg</em>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {timelineEvents.length > 0 && (
          <section className="acr-record-events-card" aria-label="Horaires RCP et traitements">
            <h4>Horaires RCP / traitements</h4>
            <ul className="acr-record-events">
              {timelineEvents.map((event) => (
                <li key={event.id}>
                  <strong>{formatWallTime(event.at)}</strong>
                  <span>T+{formatAcrElapsed(event.t)}</span>
                  <em>{event.label}</em>
                </li>
              ))}
            </ul>
          </section>
        )}
      </Section>

      {/* 6. Analyse du dossier médical */}
      <Section title="6. Analyse du dossier médical">
        <CheckOption
          checked={Boolean(record.analyseDossier.directivesAnticipeesContraireRcp)}
          onChange={() =>
            updateRecord((prev) => ({
              ...prev,
              analyseDossier: {
                ...prev.analyseDossier,
                directivesAnticipeesContraireRcp:
                  !prev.analyseDossier.directivesAnticipeesContraireRcp,
              },
            }))
          }
        >
          Directives anticipées / niveau de soins contraire à la RCP
        </CheckOption>
        <div className="acr-record-causes">
          <div>
            <strong>5H</strong>
            <div className="acr-record-chip-group">
              {ACR_H_CAUSES.map((cause) => (
                <Chip
                  key={cause}
                  active={record.analyseDossier.causesH.includes(cause)}
                  onClick={() =>
                    updateRecord((prev) => ({
                      ...prev,
                      analyseDossier: {
                        ...prev.analyseDossier,
                        causesH: toggleInArray(prev.analyseDossier.causesH, cause),
                      },
                    }))
                  }
                >
                  {cause}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <strong>5T</strong>
            <div className="acr-record-chip-group">
              {ACR_T_CAUSES.map((cause) => (
                <Chip
                  key={cause}
                  active={record.analyseDossier.causesT.includes(cause)}
                  onClick={() =>
                    updateRecord((prev) => ({
                      ...prev,
                      analyseDossier: {
                        ...prev.analyseDossier,
                        causesT: toggleInArray(prev.analyseDossier.causesT, cause),
                      },
                    }))
                  }
                >
                  {cause}
                </Chip>
              ))}
            </div>
          </div>
        </div>
        <div className="acr-record-check-grid">
          <CheckOption
            checked={Boolean(record.analyseDossier.ecmoRecherche)}
            onChange={() =>
              updateRecord((prev) => ({
                ...prev,
                analyseDossier: {
                  ...prev.analyseDossier,
                  ecmoRecherche: !prev.analyseDossier.ecmoRecherche,
                },
              }))
            }
          >
            ECMO recherchée
          </CheckOption>
          <CheckOption
            checked={Boolean(record.analyseDossier.inclusionEcmo)}
            onChange={() =>
              updateRecord((prev) => ({
                ...prev,
                analyseDossier: {
                  ...prev.analyseDossier,
                  inclusionEcmo: !prev.analyseDossier.inclusionEcmo,
                },
              }))
            }
          >
            Critères ECMO présents
          </CheckOption>
          <CheckOption
            checked={Boolean(record.analyseDossier.nonEligibleEcmo)}
            onChange={() =>
              updateRecord((prev) => ({
                ...prev,
                analyseDossier: {
                  ...prev.analyseDossier,
                  nonEligibleEcmo: !prev.analyseDossier.nonEligibleEcmo,
                },
              }))
            }
          >
            Non éligible ECMO
          </CheckOption>
        </div>
      </Section>

      {/* 7. RACS */}
      <Section title="7. RACS (reprise d'activité cardiaque spontanée)">
        <div className="acr-record-fields acr-record-compact-fields">
          <Field
            label="Heure RACS"
            value={record.racs.heure || record.horaires.racs}
            placeholder="auto"
            onChange={(value) =>
              updateRecord((prev) => ({
                ...prev,
                horaires: { ...prev.horaires, racs: value },
                racs: { ...prev.racs, heure: value },
              }))
            }
          />
        </div>
        <CheckOption
          className="acr-record-racs-obtained"
          checked={Boolean(record.racs.obtenu)}
          onChange={() =>
            updateRecord((prev) => ({
              ...prev,
              racs: { ...prev.racs, obtenu: !prev.racs.obtenu },
            }))
          }
        >
          RACS obtenu
        </CheckOption>
        <div
          className="acr-record-chip-group acr-record-wake-signs"
          role="group"
          aria-label="Signes de réveil"
        >
          <span className="acr-record-chip-label">Signes de réveil</span>
          {SIGNE_REVEIL.map((signe) => (
            <Chip
              key={signe}
              active={record.racs.signesReveil.includes(signe)}
              onClick={() =>
                updateRecord((prev) => ({
                  ...prev,
                  racs: {
                    ...prev.racs,
                    signesReveil: toggleInArray(prev.racs.signesReveil, signe),
                  },
                }))
              }
            >
              {signe}
            </Chip>
          ))}
        </div>
        {record.racs.signesReveil.includes("Autre") && (
          <div className="acr-record-fields acr-record-compact-fields acr-record-wake-precision">
            <Field
              label="Préciser"
              value={record.racs.signesReveilAutre}
              placeholder="Préciser…"
              onChange={(value) =>
                updateRecord((prev) => ({
                  ...prev,
                  racs: { ...prev.racs, signesReveilAutre: value },
                }))
              }
            />
          </div>
        )}
        <div className="acr-record-check-grid">
          <CheckOption
            checked={Boolean(record.racs.monitorageComplet)}
            onChange={() =>
              updateRecord((prev) => ({
                ...prev,
                racs: { ...prev.racs, monitorageComplet: !prev.racs.monitorageComplet },
              }))
            }
          >
            Monitorage complet (PA, SpO₂, ECG)
          </CheckOption>
          <CheckOption
            checked={Boolean(record.racs.ecg18d)}
            onChange={() =>
              updateRecord((prev) => ({
                ...prev,
                racs: { ...prev.racs, ecg18d: !prev.racs.ecg18d },
              }))
            }
          >
            ECG 18D
          </CheckOption>
          <CheckOption
            checked={Boolean(record.racs.sedationAmines)}
            onChange={() =>
              updateRecord((prev) => ({
                ...prev,
                racs: { ...prev.racs, sedationAmines: !prev.racs.sedationAmines },
              }))
            }
          >
            Sédation / amines si besoin
          </CheckOption>
        </div>
      </Section>

      {/* 8. Devenir & commentaires */}
      <Section title="8. Devenir & commentaires">
        <div className="acr-record-chip-group">
          {DESTINATIONS.map((destination) => (
            <Chip
              key={destination}
              active={record.devenir.destination === destination}
              onClick={() =>
                updateRecord((prev) => ({
                  ...prev,
                  devenir: { ...prev.devenir, destination },
                }))
              }
            >
              {destination}
            </Chip>
          ))}
        </div>
        <label className="acr-record-textarea">
          <span>Commentaires</span>
          <textarea
            value={record.devenir.commentaires ?? ""}
            placeholder="Transmission, décisions, destination, éléments médico-légaux…"
            onChange={(event: { currentTarget: HTMLTextAreaElement }) =>
              updateRecord((prev) => ({
                ...prev,
                devenir: { ...prev.devenir, commentaires: event.currentTarget.value },
              }))
            }
          />
        </label>
      </Section>
    </div>
  </div>
);

export default AcrRecordContent;
