/**
 * ONE-TIME import of the legacy MediaWiki {{RankingEvent}} (type=player) blocks
 * into the PlayerRanking table (KRAFTON rankings).
 *
 * - Players are matched case-insensitively by IGN; missing players are created
 *   with a unique slug.
 * - Teams referenced by player rows are matched/created the same way so the
 *   widget can show team names + profile links.
 * - Tournaments are linked by case-insensitive name when they exist; otherwise
 *   the row is stored unlinked (manual entry — still counts).
 * - Idempotent: rows whose (playerId, endDate, tier) already exist are skipped.
 *
 * Run: npx tsx scripts/import-player-ranking-events.ts
 */
import prisma from '../lib/prisma';
import { slugify } from '../lib/utils';

const WIKITEXT = `
{{RankingEvent
| type = player
| tournament = Battlegrounds Mobile India Series 2024
| tier = Publisher
| end_date = 2024-06-30
| 1 = player=Aaru, team=Team Aaru, finishes=17
| 2 = player=Aditya, team=8Bit, finishes=18
| 3 = player=Afu, team=Team Insane Esports, finishes=20
| 4 = player=AIMGOD, team=Raven Esports, finishes=11
| 5 = player=Akshat, team=Carnival Gaming, finishes=13
| 6 = player=Altu, team=Venom Gaming, finishes=12
| 7 = player=Attanki, team=Team Aaru, finishes=17
| 8 = player=Austinbotx, team=Vasista Esports, finishes=11
| 9 = player=BarryOG, team=Inferno Squad, finishes=2
| 10 = player=Beast, team=Global Esports, finishes=18
| 11 = player=Clutch, team=FS Esports, finishes=18
| 12 = player=DeltaPG, team=Mogo Esports, finishes=15
| 13 = player=Destro, team=Mogo Esports, finishes=17
| 14 = player=Dionysus, team=Team Aaru, finishes=18
| 15 = player=DragonOP, team=Team Limra Esports, finishes=17
| 16 = player=EviL, team=Team Insane Esports, finishes=15
| 17 = player=FoxOP, team=Team Tamilas, finishes=15
| 18 = player=Fury, team=Venom Gaming, finishes=25
| 19 = player=Goblin, team=Carnival Gaming, finishes=8
| 20 = player=Gokul, team=Team Limra Esports, finishes=26
| 21 = player=Gravity, team=Reckoning Esports, finishes=12
| 22 = player=Hanzo, team=Raven Esports, finishes=11
| 23 = player=Hector, team=Carnival Gaming, finishes=0
| 24 = player=Hesperos, team=Team Limra Esports, finishes=20
| 25 = player=Hitman, team=FS Esports, finishes=5
| 26 = player=Hulk, team=Raven Esports, finishes=20
| 27 = player=Hunterz, team=Reckoning Esports, finishes=22
| 28 = player=Immortal, team=Reckoning Esports, finishes=4
| 29 = player=JatinOG, team=Inferno Squad, finishes=8
| 30 = player=Juicy, team=8Bit, finishes=8
| 31 = player=Justin, team=Mogo Esports, finishes=19
| 32 = player=K47st, team=Vasista Esports, finishes=1
| 33 = player=Mac, team=8Bit, finishes=12
| 34 = player=ManthanOG, team=Inferno Squad, finishes=4
| 35 = player=manty, team=Team Tamilas, finishes=16
| 36 = player=Manya, team=Team SouL, finishes=18
| 37 = player=Mavi, team=Global Esports, finishes=16
| 38 = player=MaxyOP, team=Team Tamilas, finishes=13
| 39 = player=Mighty, team=8Bit, finishes=27
| 40 = player=MJ, team=Vasista Esports, finishes=12
| 41 = player=MrIGL, team=Team Tamilas, finishes=9
| 42 = player=Nakul, team=Team SouL, finishes=25
| 43 = player=Neyo, team=Carnival Gaming, finishes=11
| 44 = player=NinjaBoi, team=Global Esports, finishes=37, mvp_tourney=1, mvp_finals=1
| 45 = player=NinjaJOD, team=Team Xspark, finishes=27
| 46 = player=Omega, team=Inferno Squad, finishes=4
| 47 = player=Omegaaa, team=Carnival Gaming, finishes=12
| 48 = player=Owen, team=Inferno Squad, finishes=4
| 49 = player=Phantom, team=Venom Gaming, finishes=18
| 50 = player=Pokownl, team=Team Limra Esports, finishes=15
| 51 = player=RageGod, team=Vasista Esports, finishes=13
| 52 = player=REAPER, team=Raven Esports, finishes=21
| 53 = player=Robin, team=Mogo Esports, finishes=2, survivor=1
| 54 = player=Rony, team=Team SouL, finishes=18
| 55 = player=Sarang, team=Team Xspark, finishes=29
| 56 = player=Shadow, team=Team Insane Esports, finishes=10
| 57 = player=Shadow7, team=Team Xspark, finishes=23
| 58 = player=Shikarijod, team=Reckoning Esports, finishes=8
| 59 = player=Shogun, team=Mogo Esports, finishes=7
| 60 = player=Siuuu, team=Vasista Esports, finishes=7
| 61 = player=Slug, team=Global Esports, finishes=22
| 62 = player=Spower, team=Team SouL, finishes=21
| 63 = player=Spraygod, team=Team Xspark, finishes=21
| 64 = player=5py, team=Team Insane Esports, finishes=13
| 65 = player=Tracegod, team=FS Esports, finishes=17
| 66 = player=VenoM, team=Venom Gaming, finishes=21
| 67 = player=Veyron, team=Team Aaru, finishes=10
| 68 = player=VIPER, team=Reckoning Esports, finishes=25
| 69 = player=Wizard, team=FS Esports, finishes=17
| 70 = player=Zin, team=Inferno Squad, finishes=1
}}

{{RankingEvent
| type = player
| tournament = Battlegrounds Mobile Pro Series 2024
| tier = Publisher
| end_date = 2024-09-29
| 1 = player=Aaru, team=Orangutan, finishes=22
| 2 = player=Aditya, team=8Bit, finishes=13
| 3 = player=Admino, team=GodLike Esports, finishes=22
| 4 = player=AJ, team=Bliss Esports, finishes=11
| 5 = player=AKop, team=Orangutan, finishes=15
| 6 = player=Akshu, team=Silly Esports, finishes=13
| 7 = player=Aquanox, team=Team Versatile, finishes=18
| 8 = player=Arora, team=Ignite Gaming, finishes=7
| 9 = player=Ash, team=Numen Gaming, finishes=12
| 10 = player=Attanki, team=Orangutan, finishes=22
| 11 = player=Crypto, team=Hyderabad Hyras, finishes=9
| 12 = player=Dionysus, team=Reckoning Esports, finishes=10
| 13 = player=DragonOP, team=Team Limra Esports, finishes=23
| 14 = player=Eggy, team=Bliss Esports, finishes=12
| 15 = player=Encore, team=Medal Esports, finishes=5
| 16 = player=Goku, team=Phoenix Esports, finishes=11
| 17 = player=Gokul, team=Team Limra Esports, finishes=8
| 18 = player=GOTEN, team=Inferno Squad, finishes=16
| 19 = player=Gravity, team=Reckoning Esports, finishes=10
| 20 = player=Hesperos, team=Team Limra Esports, finishes=14
| 21 = player=Honey, team=Phoenix Esports, finishes=25
| 22 = player=Hulk, team=Ignite Gaming, finishes=3
| 23 = player=Hunterz, team=Reckoning Esports, finishes=22
| 24 = player=Hydro, team=Silly Esports, finishes=17
| 25 = player=Immortal, team=Reckoning Esports, finishes=10
| 26 = player=Infernoo, team=Silly Esports, finishes=10
| 27 = player=Infinity, team=Team Versatile, finishes=18
| 28 = player=Insidious, team=Hyderabad Hyras, finishes=14
| 29 = player=JatinOG, team=Inferno Squad, finishes=12
| 30 = player=Jokerr, team=Team Xspark, finishes=31, survivor=1
| 31 = player=Jonathan, team=GodLike Esports, finishes=27
| 32 = player=Juicy, team=8Bit, finishes=15
| 33 = player=LEGIT, team=TWOB, finishes=23, emerging=1
| 34 = player=Mac, team=8Bit, finishes=5
| 35 = player=Mafia, team=Numen Gaming, finishes=31
| 36 = player=Mighty, team=8Bit, finishes=12
| 37 = player=Moksh, team=Hyderabad Hyras, finishes=16
| 38 = player=Omegaa, team=Numen Gaming, finishes=21
| 39 = player=Owais, team=Numen Gaming, finishes=21
| 40 = player=Owen, team=Inferno Squad, finishes=12
| 41 = player=Paradox, team=Medal Esports, finishes=15
| 42 = player=PmwiIGL, team=Inferno Squad, finishes=11
| 43 = player=Pokownl, team=Team Limra Esports, finishes=18
| 44 = player=Prince, team=TWOB, finishes=11
| 45 = player=Punkk, team=GodLike Esports, finishes=22, igl=1
| 46 = player=Raiden, team=Team Versatile, finishes=15
| 47 = player=Ranveer, team=Silly Esports, finishes=13
| 48 = player=SahilOpAf, team=Medal Esports, finishes=14
| 49 = player=Sam, team=Bliss Esports, finishes=15
| 50 = player=Sarang, team=Team Xspark, finishes=31, mvp_finals=1
| 51 = player=Sarkar, team=Ignite Gaming, finishes=8
| 52 = player=Sarvit, team=TWOB, finishes=20
| 53 = player=SaumRaj, team=Team Versatile, finishes=16
| 54 = player=Shadow7, team=Team Xspark, finishes=15
| 55 = player=Shayaan, team=Phoenix Esports, finishes=16
| 56 = player=S1MP, team=GodLike Esports, finishes=22
| 57 = player=SnowJod, team=Phoenix Esports, finishes=11
| 58 = player=Spraygod, team=Team Xspark, finishes=25, mvp_tourney=1
| 59 = player=SyraX, team=TWOB, finishes=25
| 60 = player=Termi, team=Hyderabad Hyras, finishes=9
| 61 = player=Topdawg, team=Medal Esports, finishes=9
| 62 = player=Turbo, team=Bliss Esports, finishes=21
| 63 = player=Verm1Thor, team=Ignite Gaming, finishes=8
| 64 = player=VIPER, team=Reckoning Esports, finishes=30
| 65 = player=WizzGOD, team=Orangutan, finishes=18
}}

{{RankingEvent
| type = player
| tournament = Battlegrounds Mobile India Series 2025
| tier = Publisher
| end_date = 2025-04-27
| 1 = player=Aaru, team=Orangutan, finishes=19
| 2 = player=Adil, team=Teams Hades x H4K, finishes=0
| 3 = player=Aditya, team=Cincinnati Kids, finishes=9
| 4 = player=Admino, team=GodLike Esports, finishes=37, mvp_tourney=1
| 5 = player=AKop, team=Orangutan, finishes=34
| 6 = player=Amit, team=Medal Esports, finishes=11
| 7 = player=Apollozz, team=Genesis Esports, finishes=17
| 8 = player=Aquanox, team=Team Versatile, finishes=23
| 9 = player=Arto, team=4Ever x RedxRoss, finishes=6
| 10 = player=Attanki, team=Orangutan, finishes=18
| 11 = player=Ayush, team=Teams Hades x H4K, finishes=0
| 12 = player=Beast04, team=4Ever x RedxRoss, finishes=18
| 13 = player=Bijlu, team=4Ever x RedxRoss, finishes=1
| 14 = player=ChandanOP, team=Rivalry Esports, finishes=11
| 15 = player=Crypto, team=FS Esports, finishes=14
| 16 = player=Devil, team=Teams Hades x H4K, finishes=2
| 17 = player=Devotee, team=BotArmyEsports, finishes=24
| 18 = player=Dionysus, team=Reckoning Esports, finishes=20
| 19 = player=Draxxy, team=Teams Hades x H4K, finishes=18
| 20 = player=Dreams, team=FS Esports, finishes=15
| 21 = player=Flawk, team=Cincinnati Kids, finishes=16
| 22 = player=Gojo, team=Rivalry Esports, finishes=2
| 23 = player=Gravity, team=Reckoning Esports, finishes=10
| 24 = player=Henry, team=BotArmyEsports, finishes=18
| 25 = player=Hitman, team=Rivalry Esports, finishes=9
| 26 = player=Hunterz, team=Team SouL, finishes=10
| 27 = player=Insidious, team=FS Esports, finishes=20
| 28 = player=Jelly, team=True Rippers, finishes=23
| 29 = player=Jonathan, team=GodLike Esports, finishes=38, mvp_finals=1
| 30 = player=Juicy, team=Cincinnati Kids, finishes=11
| 31 = player=KioLmao, team=True Rippers, finishes=21
| 32 = player=Knight, team=Teams Hades x H4K, finishes=8
| 33 = player=Kyoya, team=Reckoning Esports, finishes=17
| 34 = player=LEGIT, team=Medal Esports, finishes=23
| 35 = player=Levi, team=THW x NonX Esports, finishes=15
| 36 = player=Lionn, team=BotArmyEsports, finishes=2
| 37 = player=Lovish, team=THW x NonX Esports, finishes=12
| 38 = player=Lucifer, team=4Ever x RedxRoss, finishes=9
| 39 = player=Mac, team=Genesis Esports, finishes=14
| 40 = player=Magic, team=SOA Esports, finishes=19
| 41 = player=Manya, team=Team SouL, finishes=15
| 42 = player=Max, team=FS Esports, finishes=11
| 43 = player=Mighty, team=Cincinnati Kids, finishes=18
| 44 = player=Monty, team=BotArmyEsports, finishes=5
| 45 = player=Nakul, team=Team SouL, finishes=19
| 46 = player=Ninzae, team=True Rippers, finishes=14
| 47 = player=Phoenixx, team=4Ever x RedxRoss, finishes=14
| 48 = player=Punkk, team=GodLike Esports, finishes=25
| 49 = player=Raiden, team=Team Versatile, finishes=16
| 50 = player=Roman, team=THW x NonX Esports, finishes=9
| 51 = player=Rony, team=Team SouL, finishes=6
| 52 = player=RushBoy, team=THW x NonX Esports, finishes=13
| 53 = player=Samm, team=True Rippers, finishes=15
| 54 = player=Sam, team=Genesis Esports, finishes=13
| 55 = player=Sarvit, team=Medal Esports, finishes=14
| 56 = player=SarwarOG, team=Rivalry Esports, finishes=20
| 57 = player=SAUM4Y, team=Team SouL, finishes=6
| 58 = player=SaumRaj, team=Team Versatile, finishes=20, igl=1
| 59 = player=ScaryyJod, team=BotArmyEsports, finishes=27, emerging=1
| 60 = player=ShadowOG, team=Genesis Esports, finishes=10
| 61 = player=S1MP, team=GodLike Esports, finishes=16
| 62 = player=Smoker, team=SOA Esports, finishes=12
| 63 = player=Soham, team=Rivalry Esports, finishes=11
| 64 = player=Spower, team=Team Versatile, finishes=34
| 65 = player=Starboyy, team=SOA Esports, finishes=14
| 66 = player=Sujal, team=Teams Hades x H4K, finishes=3
| 67 = player=Thunder, team=Medal Esports, finishes=17
| 68 = player=Troye, team=Team Versatile, finishes=8
| 69 = player=VIPER, team=Reckoning Esports, finishes=31
| 70 = player=WizzGOD, team=Orangutan, finishes=22
| 71 = player=XoXo, team=SOA Esports, finishes=17
}}

{{RankingEvent
| type = player
| tournament = Battlegrounds Mobile Pro Series 2025
| tier = Publisher
| end_date = 2025-07-06
| 1 = player=Aadi, team=Team Insane Esports, finishes=14
| 2 = player=AimHaxx, team=2oP Official, finishes=7
| 3 = player=Anonymous, team=TWOB, finishes=13
| 4 = player=Apollozz, team=Genesis Esports, finishes=18
| 5 = player=Aquanox, team=8Bit, finishes=24
| 6 = player=Aryan, team=Team AX, finishes=13
| 7 = player=Ash, team=Team Forever, finishes=0
| 8 = player=Atom, team=Team Insane Esports, finishes=9
| 9 = player=BaDop, team=Gods Omen, finishes=8
| 10 = player=BeardBaba, team=4merical Esports, finishes=22
| 11 = player=Beast, team=K9 Esports, finishes=16
| 12 = player=BotFire, team=2oP Official, finishes=5
| 13 = player=Cloudz, team=Team Insane Esports, finishes=3
| 14 = player=DeltaPG, team=Gods Reign, finishes=22
| 15 = player=Destro, team=Gods Reign, finishes=14
| 16 = player=Devotee, team=Team AX, finishes=31
| 17 = player=DragonOP, team=4merical Esports, finishes=19, igl=1
| 18 = player=Eggy, team=Team Eggy, finishes=18
| 19 = player=EviL, team=Los Hermanos Esports, finishes=22
| 20 = player=Gamlaboy, team=8Bit, finishes=17
| 21 = player=Godx, team=NonX Esports, finishes=22
| 22 = player=Godz, team=Team Insane Esports, finishes=0
| 23 = player=Goku, team=Gods Omen, finishes=17
| 24 = player=GOTEN, team=Rising Inferno Esports, finishes=24
| 25 = player=GyroGOD, team=Gods Omen, finishes=18
| 26 = player=Henry, team=Team AX, finishes=17
| 27 = player=Hunterz, team=Genesis Esports, finishes=20
| 28 = player=Hypnotized, team=2oP Official, finishes=1
| 29 = player=INFGod, team=4TR Official, finishes=20
| 30 = player=JatinOG, team=Rising Inferno Esports, finishes=16
| 31 = player=JDGaming, team=Team Eggy, finishes=15
| 32 = player=Justin, team=Gods Reign, finishes=23
| 33 = player=KaaLan, team=Los Hermanos Esports, finishes=22
| 34 = player=K4NHA, team=TWOB, finishes=13
| 35 = player=Kalyug, team=TWOB, finishes=23
| 36 = player=Lazyy, team=Team Insane Esports, finishes=10
| 37 = player=Levi, team=NonX Esports, finishes=35, mvp_tourney=1, mvp_finals=1
| 38 = player=Liability, team=2oP Official, finishes=7
| 39 = player=Lovish, team=NonX Esports, finishes=18
| 40 = player=Mafia, team=Team Forever, finishes=23
| 41 = player=Mernox, team=Team Eggy, finishes=15
| 42 = player=Morty, team=4TR Official, finishes=8
| 43 = player=Neyo, team=Gods Reign, finishes=13
| 44 = player=NinjaBoi, team=K9 Esports, finishes=20
| 45 = player=Omegaaa, team=K9 Esports, finishes=10
| 46 = player=Owais, team=Team Forever, finishes=7
| 47 = player=Owen, team=Rising Inferno Esports, finishes=15
| 48 = player=PAINisLIVE, team=4TR Official, finishes=20
| 49 = player=PmwiIGL, team=Rising Inferno Esports, finishes=10
| 50 = player=Pokownl, team=4merical Esports, finishes=9
| 51 = player=Proo, team=Team Eggy, finishes=16
| 52 = player=Raiden, team=8Bit, finishes=15
| 53 = player=Rapido, team=TWOB, finishes=18
| 54 = player=REAPER, team=4merical Esports, finishes=21
| 55 = player=Roman, team=NonX Esports, finishes=9
| 56 = player=SaumRaj, team=8Bit, finishes=19
| 57 = player=Shadow, team=Los Hermanos Esports, finishes=18
| 58 = player=ShadowOG, team=Genesis Esports, finishes=9
| 59 = player=ShadY, team=2oP Official, finishes=6
| 60 = player=Shayaan, team=Team Forever, finishes=14
| 61 = player=Slug, team=K9 Esports, finishes=22
| 62 = player=5py, team=Los Hermanos Esports, finishes=16
| 63 = player=Stone, team=Gods Omen, finishes=20
| 64 = player=SuperMan, team=Gods Omen, finishes=11
| 65 = player=SyraX, team=Team AX, finishes=18
| 66 = player=Thunder, team=Team Forever, finishes=27
| 67 = player=Troye, team=8Bit, finishes=3
| 68 = player=UtkarsH, team=4TR Official, finishes=16
| 69 = player=Yash, team=Team Insane Esports, finishes=4
| 70 = player=ZAP, team=Genesis Esports, finishes=21
}}

{{RankingEvent
| type = player
| tournament = Battlegrounds Mobile Showdown 2025
| tier = Publisher
| end_date = 2025-10-12
| 1 = player=Aadi, team=Nebula Esports, finishes=14
| 2 = player=Aaru, team=Orangutan, finishes=14, igl=1
| 3 = player=Admino, team=GodLike Esports, finishes=20
| 4 = player=AKop, team=Orangutan, finishes=33
| 5 = player=Apollozz, team=MadKings, finishes=21
| 6 = player=Aquanox, team=8Bit, finishes=16
| 7 = player=Arjun, team=White Walkers, finishes=16
| 8 = player=Arther, team=White Walkers, finishes=20
| 9 = player=Aryan, team=Team AX, finishes=7
| 10 = player=Attanki, team=Orangutan, finishes=18
| 11 = player=BeastOG, team=8Bit, finishes=3
| 12 = player=Beast, team=K9 Esports, finishes=19
| 13 = player=Bunny, team=Mysterious4 Esports, finishes=19
| 14 = player=ClutchGod, team=MadKings, finishes=14
| 15 = player=DeltaPG, team=Gods Reign, finishes=22
| 16 = player=Destro, team=Gods Reign, finishes=10
| 17 = player=Devotee, team=Team AX, finishes=21
| 18 = player=Flash, team=White Walkers, finishes=11
| 19 = player=Goblin, team=Team SouL, finishes=19
| 20 = player=Godx, team=FS Esports, finishes=20
| 21 = player=Harsh, team=True Rippers, finishes=15
| 22 = player=Hector, team=Vasista Esports, finishes=9
| 23 = player=Henry, team=Team AX, finishes=15
| 24 = player=Hero, team=Mysterious4 Esports, finishes=24
| 25 = player=Hydro, team=True Rippers, finishes=30
| 26 = player=Jelly, team=True Rippers, finishes=18
| 27 = player=Jokerr, team=Team SouL, finishes=27
| 28 = player=Jonathan, team=GodLike Esports, finishes=23
| 29 = player=Juicy, team=Cincinnati Kids, finishes=12
| 30 = player=Justin, team=Gods Reign, finishes=17
| 31 = player=KioLmao, team=True Rippers, finishes=14
| 32 = player=KNOWME, team=Nebula Esports, finishes=4
| 33 = player=KRATOS, team=Nebula Esports, finishes=34
| 34 = player=LEGIT, team=Team SouL, finishes=23
| 35 = player=Levi, team=FS Esports, finishes=26
| 36 = player=Lovish, team=FS Esports, finishes=14
| 37 = player=Mafia, team=Victores Sumus, finishes=24
| 38 = player=Nakul, team=Team SouL, finishes=25
| 39 = player=Neyo, team=Gods Reign, finishes=26
| 40 = player=NinjaBoi, team=K9 Esports, finishes=29, mvp_tourney=1
| 41 = player=Ninzae, team=Victores Sumus, finishes=11
| 42 = player=Omegaaa, team=K9 Esports, finishes=10
| 43 = player=Omegaa, team=Mysterious4 Esports, finishes=19
| 44 = player=Owais, team=Victores Sumus, finishes=6
| 45 = player=Phoenix, team=Nebula Esports, finishes=21
| 46 = player=Pro, team=MadKings, finishes=27
| 47 = player=Proo, team=Vasista Esports, finishes=13
| 48 = player=Punkk, team=GodLike Esports, finishes=7
| 49 = player=Raiden, team=8Bit, finishes=10
| 50 = player=Roman, team=FS Esports, finishes=10
| 51 = player=Ryu, team=Nebula Esports, finishes=1
| 52 = player=SahilOpAf, team=Vasista Esports, finishes=15
| 53 = player=Sam, team=Victores Sumus, finishes=20
| 54 = player=SAUM4Y, team=Cincinnati Kids, finishes=23
| 55 = player=SaumRaj, team=8Bit, finishes=12
| 56 = player=ScaryyJod, team=Vasista Esports, finishes=12
| 57 = player=ShadowOG, team=MadKings, finishes=15
| 58 = player=S1MP, team=GodLike Esports, finishes=9
| 59 = player=Skipz, team=Cincinnati Kids, finishes=15
| 60 = player=Slug, team=K9 Esports, finishes=22
| 61 = player=SnowJod, team=Mysterious4 Esports, finishes=34, mvp_finals=1
| 62 = player=Spower, team=8Bit, finishes=25
| 63 = player=SyraX, team=Team AX, finishes=18
| 64 = player=Vegito, team=White Walkers, finishes=20
| 65 = player=WizzGOD, team=Orangutan, finishes=27
| 66 = player=Zeref, team=Cincinnati Kids, finishes=10
}}

{{RankingEvent
| type = player
| tournament = Battlegrounds Mobile India Series 2026
| tier = Publisher
| end_date = 2026-03-29
| 1 = player=Fury, team=Genesis Esports, finishes=34
| 2 = player=Gravity, team=Genesis Esports, finishes=21
| 3 = player=Hunterz, team=Genesis Esports, finishes=40, mvp_tourney=1
| 4 = player=VIPER, team=Genesis Esports, finishes=25
| 5 = player=ZAP, team=Genesis Esports, finishes=0
| 6 = player=Admino, team=GodLike Esports, finishes=25
| 7 = player=Jonathan, team=GodLike Esports, finishes=33
| 8 = player=Manya, team=GodLike Esports, finishes=11
| 9 = player=Godz, team=GodLike Esports, finishes=0
| 10 = player=Spower, team=GodLike Esports, finishes=21
| 11 = player=Aaru, team=Orangutan, finishes=15
| 12 = player=AKop, team=Orangutan, finishes=30
| 13 = player=Attanki, team=Orangutan, finishes=28
| 14 = player=WizzGOD, team=Orangutan, finishes=19
| 15 = player=Godx, team=Reckoning Esports, finishes=3
| 16 = player=Levi, team=Reckoning Esports, finishes=23
| 17 = player=Lovish, team=Reckoning Esports, finishes=5
| 18 = player=Roman, team=Reckoning Esports, finishes=9
| 19 = player=SahilOpAf, team=Reckoning Esports, finishes=17
| 20 = player=NinjaJOD, team=Revenant XSpark, finishes=11
| 21 = player=Pain, team=Revenant XSpark, finishes=34
| 22 = player=Punkk, team=Revenant XSpark, finishes=10
| 23 = player=JDGaming, team=Revenant XSpark, finishes=2
| 24 = player=Tracegod, team=Revenant XSpark, finishes=27
| 25 = player=Goblin, team=Team SouL, finishes=35
| 26 = player=Jokerr, team=Team SouL, finishes=29
| 27 = player=LEGIT, team=Team SouL, finishes=38, mvp_finals=1
| 28 = player=Nakul, team=Team SouL, finishes=17, igl=1
| 29 = player=Thunder, team=Team SouL, finishes=0
| 30 = player=AIMGOD, team=Team Tamilas, finishes=14
| 31 = player=FoxOP, team=Team Tamilas, finishes=18
| 32 = player=MrIGL, team=Team Tamilas, finishes=21
| 33 = player=REAPER, team=Team Tamilas, finishes=8
| 34 = player=Knight, team=K9 Esports, finishes=26
| 35 = player=NinjaBoi, team=K9 Esports, finishes=16
| 36 = player=Omegaaa, team=K9 Esports, finishes=20
| 37 = player=Slug, team=K9 Esports, finishes=14
| 38 = player=Honey, team=Team LEFP, finishes=14
| 39 = player=Max, team=Team LEFP, finishes=12
| 40 = player=RushBoy, team=Team LEFP, finishes=11
| 41 = player=Termi, team=Team LEFP, finishes=22
| 42 = player=DADDY, team=Myth Official, finishes=15
| 43 = player=Detrox, team=Myth Official, finishes=25, emerging=1
| 44 = player=Harshil, team=Myth Official, finishes=8
| 45 = player=ARYTON, team=Myth Official, finishes=0
| 46 = player=LuciFeR, team=Myth Official, finishes=15
| 47 = player=Aadi, team=Nebula Esports, finishes=9
| 48 = player=KNOWME, team=Nebula Esports, finishes=17
| 49 = player=KRATOS, team=Nebula Esports, finishes=15
| 50 = player=Ryu, team=Nebula Esports, finishes=4
| 51 = player=Phoenix, team=Nebula Esports, finishes=15
| 52 = player=Apollozz, team=Meta Ninza, finishes=19
| 53 = player=Fierce, team=Meta Ninza, finishes=15
| 54 = player=Shadow7, team=Meta Ninza, finishes=11
| 55 = player=Javin, team=Meta Ninza, finishes=10
| 56 = player=WhiteT1ger, team=Meta Ninza, finishes=9
| 57 = player=Beast, team=Vasista Esports, finishes=24
| 58 = player=Hector, team=Vasista Esports, finishes=8
| 59 = player=SAUM4Y, team=Vasista Esports, finishes=20
| 60 = player=Shayaan, team=Vasista Esports, finishes=16
| 61 = player=Mafia, team=Victores Sumus, finishes=33
| 62 = player=Owais, team=Victores Sumus, finishes=7
| 63 = player=ScaryyJod, team=Victores Sumus, finishes=21
| 64 = player=VenoM, team=Victores Sumus, finishes=18
| 65 = player=SARANGG, team=Victores Sumus, finishes=0
| 66 = player=Gokul, team=Welt Esports, finishes=6
| 67 = player=Justy, team=Welt Esports, finishes=14
| 68 = player=ProToN, team=Welt Esports, finishes=19
| 69 = player=Maxioso, team=Welt Esports, finishes=0
| 70 = player=Shyam, team=Welt Esports, finishes=9
| 71 = player=GOTEN, team=Wyld Fangs, finishes=25
| 72 = player=K4NHA, team=Wyld Fangs, finishes=15
| 73 = player=Sam, team=Wyld Fangs, finishes=0
| 74 = player=Sensei, team=Wyld Fangs, finishes=6
| 75 = player=Spraygod, team=Wyld Fangs, finishes=18
}}

{{RankingEvent
| type = player
| tournament = Battlegrounds Mobile Pro Series 2026
| tier = Publisher
| end_date = 2026-06-21
| 1 = player=RexBoy, team=7Gods Esports, finishes=21
| 2 = player=Ninja, team=7Gods Esports, finishes=19
| 3 = player=Ninnjuuu, team=7Gods Esports, finishes=13
| 4 = player=Moksh, team=7Gods Esports, finishes=8
| 5 = player=Skipz, team=8Bit, finishes=23
| 6 = player=Sarang, team=8Bit, finishes=22
| 7 = player=Shubh, team=8Bit, finishes=18
| 8 = player=Juicy, team=8Bit, finishes=8
| 9 = player=Slug, team=Divine Gaming, finishes=29, mvp_finals=1
| 10 = player=Knight, team=Divine Gaming, finishes=25
| 11 = player=NinjaBoi, team=Divine Gaming, finishes=24
| 12 = player=Omegaaa, team=Divine Gaming, finishes=15
| 13 = player=VIPER, team=Genesis Esports, finishes=21
| 14 = player=Hunterz, team=Genesis Esports, finishes=20
| 15 = player=Fury, team=Genesis Esports, finishes=16
| 16 = player=Gravity, team=Genesis Esports, finishes=12
| 17 = player=Spower, team=GodLike Esports, finishes=30
| 18 = player=Admino, team=GodLike Esports, finishes=29
| 19 = player=SAUM4Y, team=GodLike Esports, finishes=28
| 20 = player=Manya, team=GodLike Esports, finishes=16
| 21 = player=Aquanox, team=Gods Reign, finishes=27
| 22 = player=Justin, team=Gods Reign, finishes=26
| 23 = player=Neyo, team=Gods Reign, finishes=25
| 24 = player=DeltaPG, team=Gods Reign, finishes=15
| 25 = player=Harshil, team=Myth Official, finishes=18
| 26 = player=Detrox, team=Myth Official, finishes=12
| 27 = player=LuciFeR, team=Myth Official, finishes=9
| 28 = player=DADDY, team=Myth Official, finishes=8
| 29 = player=Aryton, team=Myth Official, finishes=3
| 30 = player=Phoenix, team=Nebula Esports, finishes=26
| 31 = player=KRATOS, team=Nebula Esports, finishes=24
| 32 = player=Aadi, team=Nebula Esports, finishes=15, igl=1
| 33 = player=KNOWME, team=Nebula Esports, finishes=8
| 34 = player=WizzGOD, team=Orangutan, finishes=27
| 35 = player=AKop, team=Orangutan, finishes=26
| 36 = player=Aaru, team=Orangutan, finishes=14
| 37 = player=Attanki, team=Orangutan, finishes=11
| 38 = player=Proo, team=Reckoning Esports, finishes=23
| 39 = player=Levi, team=Reckoning Esports, finishes=19
| 40 = player=Roman, team=Reckoning Esports, finishes=14
| 41 = player=SahilOpAf, team=Reckoning Esports, finishes=8
| 42 = player=Lovish, team=Reckoning Esports, finishes=3
| 43 = player=Tracegod, team=Revenant XSpark, finishes=24
| 44 = player=Pain, team=Revenant XSpark, finishes=16
| 45 = player=NinjaJOD, team=Revenant XSpark, finishes=13
| 46 = player=ProToN, team=Revenant XSpark, finishes=8
| 47 = player=Sukuna, team=Revenant XSpark, finishes=4
| 48 = player=Jonathan, team=Team Apex Gaming, finishes=30
| 49 = player=Hydro, team=Team Apex Gaming, finishes=23
| 50 = player=Harsh, team=Team Apex Gaming, finishes=22
| 51 = player=Jelly, team=Team Apex Gaming, finishes=18
| 52 = player=LEGIT, team=Team SouL, finishes=24
| 53 = player=Jokerr, team=Team SouL, finishes=18
| 54 = player=Goblin, team=Team SouL, finishes=17
| 55 = player=Nakul, team=Team SouL, finishes=6
| 56 = player=AIMGOD, team=Team Tamilas, finishes=26
| 57 = player=REAPER, team=Team Tamilas, finishes=26
| 58 = player=Justy, team=Team Tamilas, finishes=20
| 59 = player=MrIGL, team=Team Tamilas, finishes=6
| 60 = player=A1mbot, team=Vasista Esports, finishes=23
| 61 = player=Rony, team=Vasista Esports, finishes=23
| 62 = player=Beast, team=Vasista Esports, finishes=18
| 63 = player=Hector, team=Vasista Esports, finishes=11
| 64 = player=Mafia, team=Victores Sumus, finishes=31
| 65 = player=ScaryyJod, team=Victores Sumus, finishes=21, mvp_tourney=1
| 66 = player=VenoM, team=Victores Sumus, finishes=15
| 67 = player=Owais, team=Victores Sumus, finishes=12
}}
`;

interface ParsedEntry {
  player: string;
  team: string;
  finishes: number;
  flags: { mvpTourney: number; mvpFinals: number; igl: number; survivor: number; emerging: number };
}

interface ParsedEvent {
  tournament: string;
  tier: string;
  endDate: string;
  entries: ParsedEntry[];
}

const FLAG_KEYS = ['mvp_tourney', 'mvp_finals', 'igl', 'survivor', 'emerging'] as const;

function parseWikitext(text: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  const blocks = text.match(/\{\{RankingEvent[\s\S]*?\}\}/g) ?? [];

  for (const block of blocks) {
    let tournament = '';
    let tier = '';
    let endDate = '';
    const entries: ParsedEntry[] = [];

    for (const rawLine of block.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line.startsWith('|')) continue;
      const body = line.slice(1).trim();

      const header = body.match(/^(type|tournament|tier|end_date)\s*=\s*(.+)$/i);
      if (header) {
        const key = header[1].toLowerCase();
        const value = header[2].trim();
        if (key === 'tournament') tournament = value;
        else if (key === 'tier') tier = value;
        else if (key === 'end_date') endDate = value;
        continue;
      }

      const rowLine = body.match(
        /^(\d+)\s*=\s*player\s*=\s*(.+?)\s*,\s*team\s*=\s*(.+?),\s*finishes\s*=\s*(\d+)\s*(.*)$/i
      );
      if (rowLine) {
        const flags = { mvpTourney: 0, mvpFinals: 0, igl: 0, survivor: 0, emerging: 0 };
        const flagText = rowLine[5] ?? '';
        for (const m of flagText.matchAll(/([a-z_]+)\s*=\s*1/gi)) {
          const key = m[1].toLowerCase();
          if ((FLAG_KEYS as readonly string[]).includes(key)) {
            const camelize = key
              .split('_')
              .map((p, i) => (i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1)))
              .join('') as keyof typeof flags;
            flags[camelize] = 1;
          }
        }
        entries.push({ player: rowLine[2].trim(), team: rowLine[3].trim(), finishes: Number(rowLine[4]), flags });
      }
    }

    if (tournament && endDate && entries.length > 0) {
      events.push({ tournament, tier, endDate, entries });
    }
  }
  return events;
}

async function resolveOrCreateTeam(name: string, cache: Map<string, string>): Promise<string> {
  const key = name.trim().toLowerCase();
  const existing = cache.get(key);
  if (existing) return existing;

  const base = slugify(name) || `team-${Date.now()}`;
  let slug = base;
  let i = 2;
  while (await prisma.team.findFirst({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${i++}`;
  }
  const created = await prisma.team.create({ data: { name: name.trim(), slug } });
  cache.set(key, created.id);
  return created.id;
}

async function main() {
  const events = parseWikitext(WIKITEXT);
  console.log(`Parsed ${events.length} events, ${events.reduce((s, e) => s + e.entries.length, 0)} entries.`);

  const [existingPlayers, existingTeams, existingTournaments, existingRankingRows] = await Promise.all([
    prisma.player.findMany({ select: { id: true, ign: true } }),
    prisma.team.findMany({ select: { id: true, name: true } }),
    prisma.tournament.findMany({ select: { id: true, name: true } }),
    prisma.playerRanking.findMany({ select: { playerId: true, endDate: true, tier: true } }),
  ]);

  const playerByName = new Map(existingPlayers.map((p) => [p.ign.trim().toLowerCase(), p.id]));
  const teamByName = new Map(existingTeams.map((t) => [t.name.trim().toLowerCase(), t.id]));
  const tournamentByName = new Map(existingTournaments.map((t) => [t.name.trim().toLowerCase(), t.id]));
  const rowKey = (playerId: string, endDate: Date, tier: string) => `${playerId}|${endDate.toISOString().slice(0, 10)}|${tier}`;
  const existingRowKeys = new Set(existingRankingRows.map((r) => rowKey(r.playerId, r.endDate, r.tier)));

  let playersCreated = 0;
  let teamsCreated = 0;
  let rowsCreated = 0;
  let rowsSkipped = 0;
  let tournamentsLinked = 0;
  let tournamentsUnlinked = 0;

  for (const event of events) {
    const end = new Date(`${event.endDate}T12:00:00Z`);
    if (isNaN(end.getTime())) {
      console.warn(`!! Bad end_date for "${event.tournament}" — skipped event.`);
      rowsSkipped += event.entries.length;
      continue;
    }

    const tournamentId = tournamentByName.get(event.tournament.trim().toLowerCase()) ?? null;
    if (tournamentId) tournamentsLinked += 1;
    else tournamentsUnlinked += 1;

    for (const entry of event.entries) {
      const playerKey = entry.player.trim().toLowerCase();
      let playerId = playerByName.get(playerKey);
      if (!playerId) {
        const base = slugify(entry.player) || `player-${Date.now()}`;
        let slug = base;
        let i = 2;
        while (await prisma.player.findFirst({ where: { slug }, select: { id: true } })) {
          slug = `${base}-${i++}`;
        }
        const created = await prisma.player.create({ data: { ign: entry.player, slug } });
        playerByName.set(playerKey, created.id);
        playerId = created.id;
        playersCreated += 1;
      }

      const teamId = entry.team ? await resolveOrCreateTeam(entry.team, teamByName) : null;

      const dedupeKey = rowKey(playerId, end, event.tier);
      if (existingRowKeys.has(dedupeKey)) {
        rowsSkipped += 1;
        continue;
      }

      await prisma.playerRanking.create({
        data: {
          tournamentId,
          tier: event.tier,
          endDate: end,
          playerId,
          teamId,
          finishes: entry.finishes,
          mvpTourney: entry.flags.mvpTourney,
          mvpFinals: entry.flags.mvpFinals,
          igl: entry.flags.igl,
          survivor: entry.flags.survivor,
          emerging: entry.flags.emerging,
        },
      });
      existingRowKeys.add(dedupeKey);
      rowsCreated += 1;
    }
    console.log(`✓ ${event.tournament} (${event.tier}, ${event.endDate}) — ${event.entries.length} entries`);
  }

  console.log('---');
  console.log(`Rows created: ${rowsCreated}`);
  console.log(`Rows skipped (duplicates): ${rowsSkipped}`);
  console.log(`Players created: ${playersCreated}`);
  console.log(`Teams created (player-row orgs missing from DB): ${teamsCreated}`);
  console.log(`Events linked to a tournament: ${tournamentsLinked}`);
  console.log(`Events stored unlinked: ${tournamentsUnlinked}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Import failed:', e);
  process.exit(1);
});
