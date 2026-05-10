# EV Charge Manager - Questionnaire Utilisateurs

Ce document contient un questionnaire exploitable pour la phase d'etude des besoins de la plateforme web/mobile de gestion de bornes de recharge en Algerie.

## Objectif

Recueillir des besoins fonctionnels et operationnels pour trois profils:
- Conducteur VE
- Operateur reseau
- Gestionnaire de bornes

Les reponses serviront a prioriser les fonctionnalites produit:
- Cartographie temps reel
- Reservation de creneaux
- Paiement integre
- Interoperabilite OCPP (1.6/2.0.1/2.1)
- Smart charging

## Structure recommandee dans Google Forms

Creer 4 sections:
1. Tronc commun
2. Conducteur VE
3. Operateur reseau
4. Gestionnaire de bornes

Question de routage obligatoire:
- "Quel est votre role principal ?"
- Type: choix multiple
- Options:
  - Conducteur VE
  - Operateur reseau
  - Gestionnaire de bornes

Configurer la logique "Aller a la section selon la reponse" pour envoyer le repondant vers la bonne section metier.

## Questions (copier-coller)

### Section 1 - Tronc commun

1. Quel est votre role principal ?  
Type: Choix multiple  
Options: Conducteur VE / Operateur reseau / Gestionnaire de bornes

2. Dans quelle wilaya exercez-vous principalement ?  
Type: Reponse courte

3. Frequence d'utilisation des bornes ou outils de supervision ?  
Type: Choix multiple  
Options: Quotidienne / Hebdomadaire / Occasionnelle

4. Quelles sont vos 3 principales difficultes actuelles ?  
Type: Cases a cocher  
Options: Disponibilite des bornes / Fiabilite / Paiement / Visibilite en temps reel / Tarification / Maintenance / Interoperabilite / Support client

5. Niveau de satisfaction global actuel  
Type: Echelle lineaire (1 a 5)

### Section 2 - Conducteur VE

1. Comment trouvez-vous une borne aujourd'hui ?  
Type: Cases a cocher  
Options: Applications mobiles / Reseaux sociaux / Bouche-a-oreille / Cartes web / Autre

2. Quelles informations sont indispensables avant de vous deplacer ?  
Type: Cases a cocher  
Options: Disponibilite / Prix / Puissance / Type connecteur / Temps d'attente

3. Avez-vous besoin de reserver un creneau ?  
Type: Choix multiple  
Options: Oui / Non

4. Temps d'attente acceptable sur site  
Type: Choix multiple  
Options: < 10 min / 10-20 min / 20-30 min / > 30 min

5. Modes de paiement preferes  
Type: Cases a cocher  
Options: CIB / Carte bancaire / Portefeuille electronique / Paiement entreprise

6. Problemes les plus frequents pendant une recharge  
Type: Cases a cocher  
Options: Borne occupee / Borne en panne / Erreur paiement / Session interrompue / Puissance insuffisante

7. Notifications mobiles les plus utiles  
Type: Cases a cocher  
Options: Borne disponible / Fin de charge / Depassement budget / Alerte anomalie

8. Importance de la navigation GPS integree  
Type: Echelle lineaire (1 a 5)

9. Importance d'une estimation du cout avant recharge  
Type: Echelle lineaire (1 a 5)

10. Fonctionnalite mobile prioritaire a ajouter  
Type: Paragraphe

### Section 3 - Operateur reseau

1. Donnees critiques manquantes pour piloter la charge en temps reel  
Type: Paragraphe

2. Horizon de prevision le plus utile  
Type: Choix multiple  
Options: 15 min / 1 h / 24 h / 7 jours

3. Criticite des pics de charge VE sur le reseau  
Type: Echelle lineaire (1 a 5)

4. Acceptez-vous des strategies de smart charging/delestage ?  
Type: Choix multiple  
Options: Oui / Non / Oui sous conditions

5. Besoin d'integration SCADA/EMS  
Type: Choix multiple  
Options: Oui / Non

6. KPI prioritaires  
Type: Cases a cocher  
Options: Charge totale / Pics de puissance / Disponibilite bornes / Taux de panne / Duree moyenne session

7. Tarification dynamique envisageable ?  
Type: Choix multiple  
Options: Oui / Non / A etudier

8. Exigences principales de securite et conformite  
Type: Paragraphe

9. Priorite du V2G / ISO 15118  
Type: Echelle lineaire (1 a 5)

10. Contrainte majeure de deploiement actuelle  
Type: Paragraphe

### Section 4 - Gestionnaire de bornes

1. Nombre et type de bornes gerees  
Type: Reponse courte

2. Taux de disponibilite moyen estime  
Type: Reponse courte

3. Causes principales d'indisponibilite  
Type: Cases a cocher  
Options: Panne materielle / Probleme reseau / Alimentation electrique / Defaut logiciel / Vandalisation

4. Modules les plus utiles dans un tableau de bord  
Type: Cases a cocher  
Options: Monitoring / Alertes / Maintenance / Reporting / Facturation

5. Delai maximal acceptable de detection d'incident  
Type: Choix multiple  
Options: Temps reel / < 5 min / < 15 min / < 1 h

6. Alertes automatiques souhaitees  
Type: Cases a cocher  
Options: SMS / Email / Notification mobile / Webhook

7. Mode actuel de maintenance  
Type: Choix multiple  
Options: Corrective / Preventive / Mixte

8. Besoin d'interoperabilite multi-marques et OCPP  
Type: Choix multiple  
Options: OCPP 1.6 / OCPP 2.0.1 / OCPP 2.1 / Multi-versions necessaires

9. Indicateurs metier prioritaires  
Type: Cases a cocher  
Options: Revenu / Taux d'occupation / MTTR / Sessions par jour / Energie distribuee

10. Fonction admin la plus critique a ameliorer  
Type: Paragraphe






## l'état de l'art
## Gestion Bornes + Mobile
Les solutions de gestion de bornes de recharge intègrent aujourd'hui des plateformes cloud avec apps mobiles pour localisation, réservation et paiement en temps réel, compatibles OCPP pour interopérabilité. Des acteurs comme Chargemap (carte collaborative européenne), Zapmap (UK avec gamification), PlugShare (rapports utilisateurs) et ABRP (planification itinéraire) dominent, avec intégration V2G et IoT pour monitoring prédictif. L'état de l'art évolue vers l'hyper-localisation (géofencing) et paiements biométriques, réduisant les temps d'attente de 40% via IA de matching.

## Smart Charging
Le smart charging optimise la charge des VE en coordonnant demande réseau, prix spot et renouvelables, via protocoles comme OCPP 2.0 pour modulation dynamique. État de l'art inclut scheduling décentralisé (blockchain pour peer-to-peer) et intégration microgrids, avec normes ISO 15118 pour Plug & Charge. Des déploiements comme Octopus Energy (UK) ajustent 100 000+ sessions/jour, économisant 20% sur pics via V2G bidirectionnel.

## Smart Charging IA
L'IA transforme le smart charging via ML pour prédiction (LSTM pour profils utilisateurs) et optimisation (DRL pour minimiser coûts/PAR), intégrant IoT pour diagnostics bornes. État de l'art : algorithmes comme Q-learning multi-agent pour V2G, systèmes comme Pulse Energy pour auto-apprentissage sur 1M+ charges, et Smart Recovery pour résolution pannes automatisée (efficacité 90%). Publications récentes soulignent scalabilité cloud-edge pour 10M+ VE d'ici 2030.

## Protocole OCPP

OCPP, géré par Open Charge Alliance, standardise échanges bornes/CMS ; version 2.1 (2025) ajoute smart charging avancé, résilience cyber et ISO 15118. État de l'art : adoption 95% marché (1.6 legacy vers 2.x), extensions pour Plug & Charge et diagnostics firmware over-the-air. Guides 2025 insistent sur interop tests pour 500+ vendors.


mobilygreen /// greencharging // nextcharge // chargemap   