-- Seed room_checklist_items with default items
INSERT INTO public.room_checklist_items (label, category, position) VALUES
  -- Identité & Présence
  ('Présent', 'Identité & Présence', 10),
  ('Pièce d''identité vérifiée', 'Identité & Présence', 20),
  ('Convocation présentée', 'Identité & Présence', 30),
  ('Émargement signé (entrée)', 'Identité & Présence', 40),
  ('Tenue / uniforme correct', 'Identité & Présence', 50),
  -- Salle & Installation
  ('Table numérotée attribuée', 'Salle & Installation', 60),
  ('Plan de salle respecté', 'Salle & Installation', 70),
  ('Espacement réglementaire respecté', 'Salle & Installation', 80),
  ('Téléphone éteint et déposé', 'Salle & Installation', 90),
  ('Sac / effets personnels rangés', 'Salle & Installation', 100),
  -- Matériel & Documents
  ('Matériel autorisé complet (stylo, règle…)', 'Matériel & Documents', 110),
  ('Calculatrice conforme (si autorisée)', 'Matériel & Documents', 120),
  ('Sujet d''examen reçu', 'Matériel & Documents', 130),
  ('Copie / feuille d''examen reçue', 'Matériel & Documents', 140),
  ('Brouillon distribué', 'Matériel & Documents', 150),
  ('En-tête anonymisé correctement rempli', 'Matériel & Documents', 160),
  ('Numéro de table / matricule reporté', 'Matériel & Documents', 170),
  -- Surveillance
  ('Surveillant assigné à la salle', 'Surveillance', 180),
  ('Consignes lues à voix haute', 'Surveillance', 190),
  ('Identité contrôlée pendant l''épreuve', 'Surveillance', 200),
  ('Aucune tentative de fraude observée', 'Surveillance', 210),
  ('Incident éventuel consigné', 'Surveillance', 220),
  -- Déroulement
  ('Arrivé(e) à l''heure', 'Déroulement', 230),
  ('Heure de début respectée', 'Déroulement', 240),
  ('Comportement correct', 'Déroulement', 250),
  ('Sortie WC consignée (si applicable)', 'Déroulement', 260),
  ('Feuille supplémentaire fournie (si demandée)', 'Déroulement', 270),
  -- Fin d'épreuve
  ('Copie remise au surveillant', 'Fin d''épreuve', 280),
  ('Copie numérotée et paginée', 'Fin d''épreuve', 290),
  ('Émargement signé (sortie)', 'Fin d''épreuve', 300),
  ('Place laissée propre', 'Fin d''épreuve', 310)
ON CONFLICT DO NOTHING;
