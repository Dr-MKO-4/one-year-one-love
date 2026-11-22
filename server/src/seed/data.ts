// Contenus initiaux originaux. Tout est modifiable depuis l'espace de configuration.
// Les éléments marqués toConfirm reprennent des repères du cahier des charges (section 1.1) à valider par Miguel.

import type {
  ChallengeData,
  Difficulty,
  MemoryData,
  RememberData,
  SentenceData,
  WkwData,
  WyrData,
} from '../../../shared/types.js';

type Seed<T> = { difficulty: Difficulty; data: T; toConfirm?: boolean };

const wkw = (difficulty: Difficulty, text: string, about: WkwData['about'] = 'both'): Seed<WkwData> => ({
  difficulty,
  data: { text, about, answers: {} },
});

export const WHO_KNOWS_WHO: Seed<WkwData>[] = [
  wkw('easy', 'Quel est mon plat préféré ?'),
  wkw('easy', 'Quelle est ma couleur préférée ?'),
  wkw('easy', 'Quelle boisson est-ce que je choisis le plus souvent ?'),
  wkw('easy', 'Suis-je plutôt du matin ou du soir ?'),
  wkw('easy', 'Quel est mon dessert préféré ?'),
  wkw('easy', 'Quelle chanson me met toujours de bonne humeur ?'),
  wkw('easy', 'Quel est mon fruit préféré ?'),
  wkw('easy', 'Sucré ou salé : qu’est-ce que je choisis presque toujours ?'),
  wkw('easy', 'Quelle application est-ce que j’ouvre en premier le matin ?'),
  wkw('easy', 'Quel est mon jour préféré de la semaine ?'),
  wkw('medium', 'Quelle est ma plus grande peur ?'),
  wkw('medium', 'Quelle est ma destination de rêve ?'),
  wkw('medium', 'Quel film est-ce que je pourrais revoir sans jamais me lasser ?'),
  wkw('medium', 'Qu’est-ce qui m’agace le plus au quotidien ?'),
  wkw('medium', 'Quel petit geste me fait fondre à coup sûr ?'),
  wkw('medium', 'Quel métier est-ce que je rêvais de faire enfant ?'),
  wkw('medium', 'Quelle est la petite manie que tout le monde remarque chez moi ?'),
  wkw('medium', 'Quel plat est-ce que je cuisine le mieux ?'),
  wkw('medium', 'Que fais-je en premier quand la pression monte ?'),
  wkw('medium', 'Quel artiste est-ce que j’écoute le plus en ce moment ?'),
  wkw('medium', 'De quoi est-ce que je ne pourrais pas me passer le matin ?'),
  wkw('hard', 'Quel souvenir d’enfance est-ce que je raconte le plus souvent ?'),
  wkw('hard', 'Quel est mon plus grand rêve pour les cinq prochaines années ?'),
  wkw('hard', 'Quelle qualité est-ce que j’aimerais avoir davantage ?'),
  wkw('hard', 'Quelle expression est-ce que je répète tout le temps ?'),
  wkw('hard', 'Quel est le cadeau le plus marquant que l’on m’ait offert ?'),
  wkw('hard', 'Comment est-ce que je me sens le plus aimé : les mots, les gestes, le temps partagé, les cadeaux ou les attentions ?'),
  wkw('hard', 'Quelle est la réussite dont je parle avec le plus de fierté ?'),
  wkw('hard', 'Selon moi, quel est mon plus grand défaut ?'),
  wkw('hard', 'Si je pouvais vivre une journée dans la peau de quelqu’un, qui choisirais-je ?'),
];

const wyr = (a: string, b: string): Seed<WyrData> => ({ difficulty: 'easy', data: { a, b } });

export const WOULD_YOU_RATHER: Seed<WyrData>[] = [
  wyr('Une soirée romantique à la maison', 'Une escapade surprise'),
  wyr('Un long voyage', 'Plusieurs petits voyages'),
  wyr('Recevoir une lettre', 'Recevoir un cadeau inattendu'),
  wyr('Un dîner aux chandelles', 'Un pique-nique au coucher du soleil'),
  wyr('Une journée à la plage', 'Une journée à la montagne'),
  wyr('Danser toute la nuit', 'Refaire le monde jusqu’à l’aube'),
  wyr('Cuisiner ensemble', 'Se faire livrer et regarder un film'),
  wyr('Un message vocal tendre', 'Un long message écrit'),
  wyr('Un week-end sans téléphone', 'Un week-end sans sortir de chez soi'),
  wyr('Revivre notre rencontre', 'Découvrir un jour de notre futur'),
  wyr('Un câlin de dix minutes', 'Un baiser de dix secondes'),
  wyr('Une surprise préparée pendant des semaines', 'Une surprise totalement improvisée'),
  wyr('Vivre au bord de la mer', 'Vivre au cœur d’une grande ville'),
  wyr('Un road trip', 'Un séjour dans un hôtel de rêve'),
  wyr('Un concert en plein air', 'Une soirée karaoké'),
  wyr('Petit-déjeuner au lit', 'Brunch en terrasse'),
  wyr('Faire une photo ensemble chaque jour', 'Écrire un mot doux chaque semaine'),
  wyr('Se dire « je t’aime » en chanson', 'Se le dire dans une autre langue'),
  wyr('Un animal de compagnie', 'Une grande plante à faire grandir ensemble'),
  wyr('Connaître toutes mes pensées pendant une heure', 'Que je connaisse toutes les tiennes'),
  wyr('Une danse lente dans le salon', 'Une balade main dans la main sous la pluie'),
  wyr('Un album photo imprimé', 'Une vidéo souvenir montée'),
  wyr('Fêter notre anniversaire à deux', 'Le fêter entouré de nos proches'),
  wyr('Un safari', 'Une croisière'),
  wyr('Apprendre une danse ensemble', 'Apprendre une langue ensemble'),
  wyr('Une soirée jeux de société', 'Une soirée série'),
  wyr('Rire aux éclats', 'Être profondément ému'),
  wyr('Partir sur un coup de tête', 'Tout planifier dans les moindres détails'),
  wyr('Un coucher de soleil', 'Un ciel étoilé'),
  wyr('Une chanson qui raconte notre histoire', 'Un poème écrit rien que pour nous'),
];

const pair = (left: MemoryData['left'], right: MemoryData['right'], difficulty: Difficulty = 'easy'): Seed<MemoryData> => ({
  difficulty,
  data: { left, right },
  toConfirm: true,
});

export const MEMORY_OF_US: Seed<MemoryData>[] = [
  pair({ kind: 'date', value: '22 mars 2025' }, { kind: 'memory', value: 'Notre rencontre' }),
  pair({ kind: 'date', value: '22 novembre 2025' }, { kind: 'memory', value: 'Le début de notre couple' }),
  pair({ kind: 'date', value: '16 avril' }, { kind: 'memory', value: 'L’anniversaire d’Adèle' }),
  pair({ kind: 'date', value: '4 décembre' }, { kind: 'memory', value: 'L’anniversaire de Miguel' }),
  pair({ kind: 'date', value: '14 février 2026' }, { kind: 'memory', value: 'Notre première Saint-Valentin' }),
  pair({ kind: 'place', value: 'Kribi' }, { kind: 'memory', value: 'Le week-end dont on rêve' }, 'medium'),
  pair({ kind: 'text', value: 'Ursule' }, { kind: 'memory', value: 'Le surnom favori de Miguel' }, 'medium'),
  pair({ kind: 'place', value: 'Douala' }, { kind: 'memory', value: 'La ville de notre histoire' }),
  pair({ kind: 'date', value: 'Octobre 2026' }, { kind: 'place', value: 'Le Ngondo' }, 'hard'),
  pair({ kind: 'date', value: '22 novembre 2026' }, { kind: 'memory', value: 'Notre premier anniversaire' }),
  pair({ kind: 'text', value: 'Mon cœur' }, { kind: 'memory', value: 'Le mot doux du quotidien' }, 'medium'),
];

const mcq = (difficulty: Difficulty, text: string, choices: string[], answer: string, toConfirm = true): Seed<RememberData> => ({
  difficulty,
  data: { text, kind: 'mcq', choices, answer },
  toConfirm,
});
const free = (
  difficulty: Difficulty,
  text: string,
  extra: Partial<RememberData> = {},
  toConfirm = false,
): Seed<RememberData> => ({ difficulty, data: { text, kind: 'free', ...extra }, toConfirm });

export const DO_YOU_REMEMBER: Seed<RememberData>[] = [
  mcq('easy', 'Quel jour nous sommes-nous rencontrés ?', ['22 mars 2025', '14 février 2025', '16 avril 2025', '22 novembre 2025'], '22 mars 2025'),
  mcq('easy', 'Quelle date célébrons-nous comme le début de notre couple ?', ['22 mars 2025', '22 novembre 2025', '1er janvier 2026', '14 février 2026'], '22 novembre 2025'),
  mcq('easy', 'Quel jour est l’anniversaire d’Adèle ?', ['16 avril', '4 décembre', '22 mars', '14 février'], '16 avril'),
  mcq('easy', 'Dans quelle ville s’écrit l’essentiel de notre histoire ?', ['Douala', 'Yaoundé', 'Kribi', 'Limbé'], 'Douala'),
  free('medium', 'Quand tombe l’anniversaire de Miguel ?', { answer: '4 décembre', keywords: ['4 décembre', 'décembre'], allowPartial: true }, true),
  mcq('medium', 'Où rêvons-nous de partir en week-end à deux ?', ['Kribi', 'Limbé', 'Zanzibar', 'Dakar'], 'Kribi', false),
  free('easy', 'Qui nous a présentés ?', { answer: 'Caliste', keywords: ['Caliste'] }),
  free('medium', 'Quel surnom Miguel donne-t-il le plus souvent à Adèle ?', { answer: 'Ursule', keywords: ['Ursule'] }, true),
  free('medium', 'Où avons-nous eu notre première longue conversation ?'),
  free('medium', 'Quel était le premier surnom que nous utilisions ?'),
  free('medium', 'Quelle chanson considérons-nous comme « la nôtre » ?'),
  free('medium', 'Quel a été notre premier restaurant ou notre première sortie ensemble ?'),
  mcq('hard', 'Combien de temps sépare notre rencontre du début de notre couple ?', ['3 mois', '6 mois', '8 mois', '1 an'], '8 mois'),
  free('hard', 'Quel événement culturel avons-nous évoqué en octobre 2026 ?', { answer: 'Le Ngondo', keywords: ['Ngondo'] }, true),
  free('hard', 'Quel est le souvenir qui nous a fait le plus rire ?', { allowPartial: true }),
  free('hard', 'Quel événement a marqué un moment important de notre relation ?', { allowPartial: true }),
  free('hard', 'Raconte un détail de notre première Saint-Valentin, le 14 février 2026.', { allowPartial: true }, true),
];

const ch = (
  difficulty: Difficulty,
  text: string,
  category: ChallengeData['category'],
  target: ChallengeData['target'],
  points: number,
  extra: Partial<ChallengeData> = {},
): Seed<ChallengeData> => ({ difficulty, data: { text, category, target, points, allowPartial: true, ...extra } });

export const LOVE_CHALLENGES: Seed<ChallengeData>[] = [
  ch('easy', 'Cite trois choses que tu apprécies chez ton partenaire.', 'romantic', 'individual', 10),
  ch('easy', 'Fais un compliment sincère à ton partenaire en le regardant dans les yeux, sans rire.', 'romantic', 'individual', 10, { allowPartial: false }),
  ch('easy', 'Imite ton partenaire quand il ou elle vient de se réveiller.', 'fun', 'individual', 10),
  ch('easy', 'Faites un selfie en reproduisant la même grimace.', 'together', 'couple', 10, { allowPartial: false }),
  ch('easy', 'Trouve un surnom tout neuf pour ton partenaire et explique pourquoi.', 'creative', 'individual', 10),
  ch('easy', 'Donne la date exacte de notre rencontre.', 'memory', 'individual', 10, { allowPartial: false }),
  ch('easy', 'Dansez ensemble trente secondes sur la première chanson de la playlist.', 'together', 'couple', 10, { durationSec: 30 }),
  ch('easy', 'Raconte en une phrase le moment où tu as su que c’était spécial.', 'romantic', 'individual', 10),
  ch('medium', 'Reproduisez votre première photo ensemble, pose comprise.', 'together', 'couple', 20),
  ch('medium', 'Écris un petit mot romantique en moins de deux minutes, puis lis-le à voix haute.', 'creative', 'individual', 20, { durationSec: 120 }),
  ch('medium', 'Raconte un souvenir commun sans prononcer les mots interdits.', 'memory', 'individual', 20, { forbiddenWords: ['nous', 'toi', 'moi', 'amour'] }),
  ch('medium', 'Fais deviner une chanson importante pour votre couple en la fredonnant, sans paroles.', 'fun', 'individual', 20, { durationSec: 60 }),
  ch('medium', 'Cite cinq moments de cette année dans l’ordre chronologique.', 'memory', 'individual', 20),
  ch('medium', 'Invente une courte chanson de quatre vers sur votre histoire.', 'creative', 'individual', 20, { durationSec: 180 }),
  ch('medium', 'Décrivez ensemble votre premier rendez-vous, une phrase chacun, sans vous contredire.', 'memory', 'couple', 20),
  ch('medium', 'Mime un moment de votre année : ton partenaire doit deviner lequel.', 'fun', 'individual', 20, { durationSec: 90 }),
  ch('medium', 'Préparez ensemble une boisson ou un en-cas en moins de cinq minutes.', 'together', 'couple', 20, { durationSec: 300 }),
  ch('medium', 'Dis « je t’aime » de trois façons différentes, dont une sans parler.', 'romantic', 'individual', 15),
  ch('medium', 'Dessine ton partenaire en soixante secondes, les yeux fermés.', 'fun', 'individual', 15, { durationSec: 60 }),
  ch('hard', 'Planifie à voix haute une journée surprise idéale pour ton partenaire, du réveil au coucher.', 'romantic', 'individual', 30),
  ch('hard', 'Écrivez ensemble trois promesses pour votre deuxième année.', 'together', 'couple', 30),
  ch('hard', 'Raconte notre histoire en une minute comme si tu étais un présentateur de journal télé.', 'creative', 'individual', 30, { durationSec: 60 }),
  ch('hard', 'Retrouvez ensemble la date de cinq moments clés de votre année.', 'memory', 'couple', 30),
  ch('hard', 'Récite les premières lignes de votre toute première conversation (ou ce qui s’en rapproche le plus).', 'memory', 'individual', 30),
  ch('hard', 'Improvisez un slow sur la chanson de votre choix, en vous regardant dans les yeux jusqu’à la fin.', 'together', 'couple', 25, { allowPartial: false }),
  ch('hard', 'Écris une déclaration de six lignes où chaque ligne commence par une lettre de son prénom.', 'creative', 'individual', 30, { durationSec: 240 }),
];

const s = (difficulty: Difficulty, prompt: string, keywordGroups: string[][] = []): Seed<SentenceData> => ({
  difficulty,
  data: { prompt, keywordGroups },
});

const PLACES = ['plage', 'mer', 'océan', 'île', 'sable'];
const HOME = ['maison', 'chez nous', 'canapé', 'lit', 'cocon'];
const TRAVEL = ['voyage', 'partir', 'avion', 'vacances', 'découvrir', 'Kribi', 'week-end'];
const FAMILY = ['famille', 'enfants', 'bébé', 'mariage', 'marier'];
const LAUGH = ['rire', 'rigoler', 'blague', 'drôle', 'fou rire'];
const FOOD = ['manger', 'restaurant', 'dîner', 'cuisine', 'repas', 'plat'];
const TALK = ['parler', 'discuter', 'conversation', 'écouter', 'confier'];

export const COMPLETE_MY_SENTENCE: Seed<SentenceData>[] = [
  s('easy', 'Le moment où je suis le plus heureux avec toi, c’est…', [HOME, LAUGH, TALK, TRAVEL]),
  s('easy', 'Si nous partions demain, je choisirais…', [PLACES, TRAVEL]),
  s('easy', 'Ce que j’aime le plus dans notre relation, c’est…', [LAUGH, TALK, ['confiance', 'sincérité', 'honnêteté'], ['complicité', 'ensemble', 'équipe']]),
  s('easy', 'Dans deux ans, j’aimerais que nous…', [FAMILY, TRAVEL, HOME]),
  s('easy', 'Notre soirée parfaite commence par…', [FOOD, HOME, ['film', 'série', 'cinéma'], ['musique', 'danser', 'danse']]),
  s('easy', 'Le plat qui nous ressemble le plus, c’est…', [FOOD]),
  s('medium', 'Le jour où j’ai compris que je tenais à toi, c’est quand…', [TALK, LAUGH]),
  s('medium', 'Notre chanson pourrait être…', [['Perfect', 'Ed Sheeran'], ['All of me', 'John Legend'], ['Ordinary', 'Alex Warren'], ['Señorita', 'Senorita']]),
  s('medium', 'Si notre histoire était un film, son titre serait…'),
  s('medium', 'La chose que je voudrais qu’on fasse plus souvent, c’est…', [TRAVEL, FOOD, TALK, ['sortir', 'sortie', 'balade']]),
  s('medium', 'Quand je pense à toi pendant la journée, je…', [['souris', 'sourire'], ['écris', 'message', 'appelle', 'appeler']]),
  s('medium', 'Le plus beau souvenir de notre première année, c’est…', [['Saint-Valentin', '14 février'], ['rencontre', '22 mars'], TRAVEL]),
  s('medium', 'Pour me remonter le moral, tu n’as qu’à…', [['câlin', 'serrer', 'bras'], LAUGH, TALK]),
  s('medium', 'Si je devais décrire notre couple en un mot, ce serait…', [['complicité', 'complices'], ['amour', 'tendresse'], ['fou', 'folie', 'joie']]),
  s('hard', 'Ce que j’ai appris sur moi grâce à toi, c’est…', [['patience', 'patient'], ['confiance', 'assurance'], ['aimer', 'amour']]),
  s('hard', 'La promesse que je veux te faire pour l’année qui vient, c’est…', [['toujours', 'jamais'], TALK, ['soutenir', 'soutien', 'présent', 'là']]),
  s('hard', 'Le défi que nous avons le mieux relevé ensemble, c’est…', [['distance', 'loin'], TALK]),
  s('hard', 'Dans dix ans, un dimanche matin chez nous ressemblera à…', [FAMILY, HOME, FOOD]),
  s('hard', 'Ce qui me rassure le plus chez toi, c’est…', [['calme', 'sérénité', 'douceur'], ['écoute', 'écouter'], ['fidèle', 'fidélité', 'loyal']]),
  s('hard', 'Le rêve que j’aimerais réaliser à tes côtés, c’est…', [TRAVEL, FAMILY, ['maison', 'construire', 'projet']]),
];

export const TIMELINE = [
  { date: "22 mars 2025", title: "La rencontre", description: "Ce jour-là, pendant une sortie entre amis, Caliste nous a présentés. On ne se connaissait pas encore vraiment, et on ne pouvait pas imaginer ce que cette simple présentation allait devenir. Qui aurait cru qu'on en arriverait là ? ❤️", toConfirm: false },
  { date: "23 mars 2025", title: "Les premiers messages", description: "Le lendemain de cette sortie, on a commencé à discuter. Un premier message, quelques échanges, des questions pour apprendre à se connaître… C'était encore le début, mais quelque chose venait de commencer. 😂❤️", toConfirm: false },
  { date: "16 avril 2025", title: "Ton anniversaire", description: "À minuit, je t'ai souhaité ton anniversaire avec ces mots : « La future femme de ma vie ». Je t'avais aussi dit que tu étais ma meilleure rencontre de l'année. Avec le recul, je trouve ça encore plus beau. 🥹❤️", toConfirm: false },
  { date: "22 novembre 2025", title: "Le début de notre histoire", description: "Ce jour-là, nous avons officiellement commencé notre relation. Ce n'était plus seulement deux personnes qui apprenaient à se connaître : c'était nous, avec l'envie de construire quelque chose ensemble. Le début de notre histoire en tant que couple. ❤️", toConfirm: false },
  { date: "4 décembre 2025", title: "Mon anniversaire", description: "Mon premier anniversaire depuis que nous sommes ensemble. Une nouvelle occasion de partager un moment particulier avec toi et de continuer à accumuler ces petits souvenirs qui font notre histoire. ❤️", toConfirm: false },
  { date: "14 février 2026", title: "Notre première Saint-Valentin", description: "Notre toute première Saint-Valentin ensemble. Je voulais profiter de cette journée pour te montrer encore davantage à quel point je t'aime et rendre ce moment spécial pour nous deux. Une première parmi tant d'autres, je l'espère. ❤️", toConfirm: false },
  { date: "Février 2026", title: "Notre projet de voyage", description: "Un voyage à deux… 😂 Peu importe où on ira, l'essentiel sera de partir ensemble, de découvrir un nouvel endroit et de se créer des souvenirs à nous. Ce projet reste encore à concrétiser, mais j'espère vraiment qu'on pourra bientôt le réaliser. ❤️", toConfirm: false },
  { date: "22 mars 2026", title: "Un an depuis notre rencontre", description: "« Il y a un an aujourd'hui, j'ai rencontré la femme avec qui j'ai envie de faire ma vie et je me sens tellement chanceux et heureux de t'avoir dans ma vie. »\n\nUn an déjà depuis cette rencontre pendant une sortie entre amis. Et quand je regarde le chemin parcouru depuis, je mesure encore plus la chance que j'ai de t'avoir rencontrée. ❤️", toConfirm: false },
  { date: "22 novembre 2026", title: "Notre premier anniversaire", description: "Un an officiellement ensemble. Un an de souvenirs, de rires, de découvertes, de projets et de moments qui nous appartiennent. Ce n'est qu'une première année, et j'espère que ce n'est que le début de beaucoup d'autres. Joyeux premier anniversaire à nous, mon cœur. ❤️", toConfirm: false },
];

export const LETTER = {
  title: "Pour toi, Adèle",
  body: "Ma vie, Werr… par où commencer ? 😂\n\nQuand je repense au 22 mars 2025, je me dis que c’est quand même incroyable de voir jusqu’où une simple présentation peut nous mener. Ce jour-là, pendant une sortie entre amis, Caliste nous a présentés. On ne savait certainement pas encore ce que cette rencontre allait devenir.\n\nLe lendemain, le 23 mars, on échangeait nos premiers messages. Et petit à petit, on a appris à se connaître, à discuter, à rire, à se taquiner… jusqu’à ce que tu prennes une place de plus en plus importante dans ma vie.\n\nJe me souviens aussi du 16 avril, ton anniversaire. Ce jour-là, je t’avais déjà appelée « la future femme de ma vie » 🥹. Avec le recul, cette phrase me fait sourire, parce qu’aujourd’hui, je suis toujours aussi heureux de t’avoir dans ma vie.\n\nPuis est arrivé le 22 novembre 2025. Ce jour où nous avons officiellement décidé de faire un bout de chemin ensemble. Depuis, on construit notre histoire à notre manière, avec nos moments de bonheur, nos rires, nos petites disputes, nos différences et surtout cette envie de continuer à avancer ensemble.\n\nJe ne vais pas prétendre que tout est toujours parfait. Mais ce que je sais, c’est que j’aime ce que nous construisons. J’aime nos discussions, nos délires, nos projets et même ces petits moments ordinaires qui deviennent précieux simplement parce que je les partage avec toi.\n\nIl y a aussi tous ces projets qu’on imagine à deux… comme cette envie de voyager ensemble. Peu importe la destination, que ce soit Kribi ou ailleurs, j’ai surtout envie qu’on puisse partir, découvrir de nouveaux endroits et créer des souvenirs qui n’appartiendront qu’à nous. Et ce voyage, on finira bien par le concrétiser hein ? 😂❤️\n\nAujourd’hui, le 22 novembre 2026, cela fait un an que nous sommes officiellement ensemble. Un an de nous, de découvertes, d’apprentissage et de souvenirs. Et si je devais revenir au début de cette histoire, je crois que je remercierais simplement le hasard, Caliste et cette fameuse sortie entre amis.\n\nMerci d’être entrée dans ma vie, mon cœur. Merci pour ta présence, pour les moments partagés et pour tout ce que nous avons encore à découvrir ensemble.\n\nJe ne sais pas exactement ce que l’avenir nous réserve, mais je sais que j’ai envie de continuer à l’écrire avec toi.\n\nJe t’aime, Adèle. ❤️",
  signature: 'Miguel',
  published: true,
};
