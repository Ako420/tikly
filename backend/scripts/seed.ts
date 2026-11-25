import axios from 'axios';
import bcrypt from 'bcrypt';
import PDFDocument from 'pdfkit';
import { BCRYPT_ROUNDS } from '../src/config/constants';
import { connectDb, disconnectDb } from '../src/config/db';
import { uploadPrivateDocument, uploadPublicImage } from '../src/lib/cloudinary';
import { Types } from 'mongoose';
import { createQrToken } from '../src/util/qrToken';
import { ticketCode } from '../src/util/ticketCode';
import {
  EventModel,
  OrderModel,
  ProviderModel,
  PostModel,
  ServiceModel,
  SlotModel,
  StaffAssignmentModel,
  TicketModel,
  TicketTierModel,
  UserModel,
} from '../src/model';
import { POSTS } from './seedPosts.data';
import type { ServiceCategory, ServiceUnit } from '../src/types/enums';

const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? 'TiklyDemo#2026';

const DEMO_ORGANIZER = { name: 'Demo Organiser', email: 'organiser@tikly.demo', phone: '+237670000001' };
const DEMO_ADMIN = { name: 'Demo Admin', email: 'admin@tikly.demo', phone: '+237670000901' };

type TierSeed = { name: 'standard' | 'vip' | 'vvip'; price: number; quantity: number };
type SlotSeed = { label: string; size: string; price: number; quantity: number };
type EventSeed = {
  title: { en: string; fr: string };
  description: { en: string; fr: string };
  category: string;
  coverSource: string;
  venue: string;
  city: string;
  startAt: string;
  durationHours: number;
  tiers: TierSeed[];
  slots: SlotSeed[];
};

const concertSlots: SlotSeed[] = [
  { label: 'Food & drinks stand', size: '3m x 3m', price: 75000, quantity: 10 },
  { label: 'Merchandise booth', size: '2m x 2m', price: 50000, quantity: 6 },
  { label: 'Sponsor activation area', size: '6m x 4m', price: 250000, quantity: 2 },
];

const festivalSlots: SlotSeed[] = [
  { label: 'Artisan craft stall', size: '3m x 3m', price: 40000, quantity: 20 },
  { label: 'Food court stand', size: '3m x 3m', price: 60000, quantity: 12 },
  { label: 'Brand pavilion', size: '6m x 6m', price: 300000, quantity: 3 },
];

const EVENTS: EventSeed[] = [
  {
    title: { en: 'Ko-C Homecoming Concert', fr: 'Ko-C Homecoming Concert' },
    description: {
      en: 'Cameroonian superstar Ko-C comes home for a night of hits from "Bolo Bolo" to his latest singles, with special guests and a full live band.',
      fr: 'La superstar camerounaise Ko-C revient à la maison pour une soirée de tubes, de « Bolo Bolo » à ses derniers singles, avec des invités spéciaux et un orchestre live.',
    },
    category: 'concert',
    coverSource:
      'https://sportsandculturenetwork.com/wp-content/uploads/2026/08/WhatsApp-Image-2026-08-17-at-12.46.40.jpeg',
    venue: 'Stade de la Réunification, Bépanda',
    city: 'Douala',
    startAt: '2026-12-19T18:00:00+01:00',
    durationHours: 6,
    tiers: [
      { name: 'standard', price: 5000, quantity: 8000 },
      { name: 'vip', price: 25000, quantity: 800 },
      { name: 'vvip', price: 100000, quantity: 100 },
    ],
    slots: concertSlots,
  },
  {
    title: { en: 'Tenor Live in Yaoundé', fr: 'Tenor en concert à Yaoundé' },
    description: {
      en: 'The Kaïzer himself, Tenor, performs his biggest hits live with a VIP brunch experience for premium ticket holders.',
      fr: 'Le Kaïzer en personne, Tenor, interprète ses plus grands succès en live, avec un brunch VIP pour les détenteurs de billets premium.',
    },
    category: 'concert',
    coverSource: 'https://www.kpjmediagroup.com/wp-content/uploads/2026/11/IMG-20261115-WA0053.jpg',
    venue: 'Concord International Hotel, Olezoa',
    city: 'Yaoundé',
    startAt: '2027-01-10T13:00:00+01:00',
    durationHours: 4,
    tiers: [
      { name: 'standard', price: 5000, quantity: 1500 },
      { name: 'vip', price: 18000, quantity: 200 },
    ],
    slots: concertSlots.slice(0, 2),
  },
  {
    title: { en: 'Salatiel: Live & Unplugged', fr: 'Salatiel : Live & Unplugged' },
    description: {
      en: 'Award-winning singer, songwriter and producer Salatiel brings an intimate acoustic set of his Afro-pop catalogue to Douala.',
      fr: 'Le chanteur, auteur-compositeur et producteur primé Salatiel présente à Douala un set acoustique intimiste de son répertoire afro-pop.',
    },
    category: 'concert',
    coverSource: 'https://lebonas.com/wp-content/uploads/2021/11/salatiel.jpeg',
    venue: 'Institut Français du Cameroun, Bonanjo',
    city: 'Douala',
    startAt: '2027-02-05T19:00:00+01:00',
    durationHours: 3,
    tiers: [
      { name: 'standard', price: 10000, quantity: 600 },
      { name: 'vip', price: 30000, quantity: 80 },
    ],
    slots: concertSlots.slice(0, 2),
  },
  {
    title: { en: 'Charlotte Dipanda in Concert', fr: 'Charlotte Dipanda en concert' },
    description: {
      en: 'The golden voice of Cameroon, Charlotte Dipanda, in a live concert accompanied by her musicians, revisiting her albums from "Mispa" to "Dipita".',
      fr: 'La voix d’or du Cameroun, Charlotte Dipanda, en concert live avec ses musiciens, revisitant ses albums de « Mispa » à « Dipita ».',
    },
    category: 'concert',
    coverSource:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/CharlotteDipanda.jpg/960px-CharlotteDipanda.jpg',
    venue: 'Palais Polyvalent des Sports',
    city: 'Yaoundé',
    startAt: '2027-02-14T20:00:00+01:00',
    durationHours: 4,
    tiers: [
      { name: 'standard', price: 15000, quantity: 3000 },
      { name: 'vip', price: 50000, quantity: 300 },
      { name: 'vvip', price: 100000, quantity: 60 },
    ],
    slots: concertSlots,
  },
  {
    title: { en: 'Ngondo Festival', fr: 'Festival Ngondo' },
    description: {
      en: 'The traditional festival of the Sawa people on the banks of the Wouri: canoe races, the sacred water ritual, Miss Ngondo, wrestling and cultural village.',
      fr: 'La fête traditionnelle du peuple Sawa sur les berges du Wouri : courses de pirogues, rite de l’eau sacrée, Miss Ngondo, lutte traditionnelle et village culturel.',
    },
    category: 'festival',
    coverSource: 'https://globalbushtratour.com/images/blog/posts/cameroon-ngondo-festival-douala.webp',
    venue: 'Berges du Wouri, Bonabéri',
    city: 'Douala',
    startAt: '2026-12-05T09:00:00+01:00',
    durationHours: 10,
    tiers: [
      { name: 'standard', price: 2000, quantity: 10000 },
      { name: 'vip', price: 20000, quantity: 500 },
    ],
    slots: festivalSlots,
  },
  {
    title: { en: 'Mount Cameroon Race of Hope', fr: 'Course de l’Espoir du Mont Cameroun' },
    description: {
      en: 'Africa’s toughest mountain race: athletes climb from Buea to the 4,095 m summit of Mount Cameroon and back. Grandstand passes and finish-line village access.',
      fr: 'La course de montagne la plus difficile d’Afrique : les athlètes montent de Buea au sommet du Mont Cameroun (4 095 m) et redescendent. Accès tribune et village d’arrivée.',
    },
    category: 'sports',
    coverSource: 'https://www.cameroon-tribune.cm//administrateur/photo/normal_cfe6bg3.jpg',
    venue: 'Molyko Omnisport Stadium',
    city: 'Buea',
    startAt: '2027-02-27T07:00:00+01:00',
    durationHours: 10,
    tiers: [
      { name: 'standard', price: 1000, quantity: 5000 },
      { name: 'vip', price: 15000, quantity: 300 },
    ],
    slots: festivalSlots.slice(1),
  },
  {
    title: { en: 'Douala Music Art Festival (DOMAF)', fr: 'Douala Music Art Festival (DOMAF)' },
    description: {
      en: 'Four days of music, street art and performances across the neighbourhoods of Douala, with workshops, concerts and an artisan market.',
      fr: 'Quatre jours de musique, d’art urbain et de performances dans les quartiers de Douala, avec ateliers, concerts et marché artisanal.',
    },
    category: 'festival',
    coverSource: 'https://doualamusicartfestival.com/wp-content/uploads/2026/06/Affiche-DOMAF-15e_2026-scaled.png',
    venue: 'Espace Doual’art, Bonanjo',
    city: 'Douala',
    startAt: '2027-03-12T16:00:00+01:00',
    durationHours: 80,
    tiers: [
      { name: 'standard', price: 3000, quantity: 4000 },
      { name: 'vip', price: 15000, quantity: 250 },
    ],
    slots: festivalSlots,
  },
  {
    title: { en: 'Festi Bikutsi', fr: 'Festi Bikutsi' },
    description: {
      en: 'The celebration of Bikutsi rhythm and Beti culture: live bands, traditional dance troupes, a dance competition and local cuisine.',
      fr: 'La célébration du rythme bikutsi et de la culture béti : orchestres live, troupes de danse traditionnelle, concours de danse et cuisine locale.',
    },
    category: 'festival',
    coverSource: 'https://www.cameroon-tribune.cm/articles/x14211_P_17_ph1_Festival.jpg',
    venue: 'Boulevard du 20 Mai',
    city: 'Yaoundé',
    startAt: '2027-04-16T15:00:00+01:00',
    durationHours: 56,
    tiers: [
      { name: 'standard', price: 2000, quantity: 6000 },
      { name: 'vip', price: 10000, quantity: 400 },
      { name: 'vvip', price: 50000, quantity: 50 },
    ],
    slots: festivalSlots,
  },
  {
    title: {
      en: 'Cameroon International Music Festival (CIMFEST)',
      fr: 'Cameroon International Music Festival (CIMFEST)',
    },
    description: {
      en: 'Four days of live concerts, DJ battles, a music-tech hackathon, master classes and a sponsor village at Molyko stadium in Buea.',
      fr: 'Quatre jours de concerts live, battles de DJ, hackathon musique et tech, master classes et village des sponsors au stade de Molyko à Buea.',
    },
    category: 'festival',
    coverSource: 'https://ayatickets.fr/uploads/events/8d4f29166742f9c401be6b48208b0a8c.png',
    venue: 'Molyko Omnisport Stadium',
    city: 'Buea',
    startAt: '2026-12-10T16:00:00+01:00',
    durationHours: 78,
    tiers: [
      { name: 'standard', price: 2000, quantity: 10000 },
      { name: 'vip', price: 15000, quantity: 600 },
      { name: 'vvip', price: 50000, quantity: 80 },
    ],
    slots: festivalSlots,
  },
  {
    title: { en: 'Écrans Noirs Film Festival', fr: 'Festival Écrans Noirs' },
    description: {
      en: 'Central Africa’s leading film festival: screenings of African features and shorts, master classes and the Écran d’Or award night.',
      fr: 'Le grand festival de cinéma d’Afrique centrale : projections de longs et courts métrages africains, master classes et soirée de l’Écran d’Or.',
    },
    category: 'film',
    coverSource: 'https://www.ecransnoirs.org/wp-content/uploads/2026/09/affiche-Ecrans-Noirs-30.jpg',
    venue: 'Palais des Congrès',
    city: 'Yaoundé',
    startAt: '2027-01-20T18:00:00+01:00',
    durationHours: 170,
    tiers: [
      { name: 'standard', price: 3000, quantity: 2000 },
      { name: 'vip', price: 20000, quantity: 200 },
    ],
    slots: concertSlots.slice(0, 2),
  },
  {
    title: { en: 'Canal 2’Or Awards Night', fr: 'Soirée Canal 2’Or' },
    description: {
      en: 'The biggest night of Cameroonian TV, film and music: red carpet, live performances and the Canal 2’Or awards.',
      fr: 'La plus grande soirée de la télé, du cinéma et de la musique camerounaise : tapis rouge, prestations live et remise des Canal 2’Or.',
    },
    category: 'awards',
    coverSource: 'https://cameroun24.net/images/news/canal2or-2026-laureats_670.jpg',
    venue: 'Palais des Congrès',
    city: 'Yaoundé',
    startAt: '2026-12-12T19:00:00+01:00',
    durationHours: 6,
    tiers: [
      { name: 'standard', price: 10000, quantity: 1500 },
      { name: 'vip', price: 50000, quantity: 200 },
      { name: 'vvip', price: 150000, quantity: 40 },
    ],
    slots: concertSlots.slice(0, 2),
  },
  {
    title: { en: 'Yaoundé en Fête (YA-FE)', fr: 'Yaoundé en Fête (YA-FE)' },
    description: {
      en: 'The end-of-year family festival in Yaoundé: fun fair rides, concerts every night, food court and New Year’s Eve countdown.',
      fr: 'Le festival familial de fin d’année à Yaoundé : manèges, concerts tous les soirs, espace restauration et compte à rebours du Nouvel An.',
    },
    category: 'festival',
    coverSource: 'https://grena.cm/uploads/events/6756f7cd76134702208414.jpg',
    venue: 'Esplanade du Palais des Congrès',
    city: 'Yaoundé',
    startAt: '2026-12-20T14:00:00+01:00',
    durationHours: 370,
    tiers: [
      { name: 'standard', price: 1000, quantity: 20000 },
      { name: 'vip', price: 10000, quantity: 800 },
    ],
    slots: festivalSlots,
  },
];

type ServiceSeed = {
  category: ServiceCategory;
  title: { en: string; fr: string };
  description: string;
  price: number;
  unit: ServiceUnit;
  photos: string[];
};
type ProviderSeed = {
  user: { name: string; email: string; phone: string };
  businessName: string;
  description: string;
  city: string;
  whatsapp: string;
  services: ServiceSeed[];
};

const PROVIDERS: ProviderSeed[] = [
  {
    user: { name: 'Golden Hall Bonapriso', email: 'goldenhall@tikly.demo', phone: '+237670000101' },
    businessName: 'Golden Hall Bonapriso',
    description:
      'Air-conditioned reception hall in the heart of Bonapriso for weddings, galas and corporate dinners. Seats up to 500 guests.',
    city: 'Douala',
    whatsapp: '+237670000101',
    services: [
      {
        category: 'hall',
        title: { en: 'Reception hall (500 guests)', fr: 'Salle de réception (500 invités)' },
        description:
          'Full-day hire including tables, air conditioning, backup generator, parking and on-site security.',
        price: 750000,
        unit: 'per_day',
        photos: [
          'https://goldenhallbonapriso.com/wp-content/uploads/2023/07/salle-banner-goldenhall.png',
          'https://goldenhallbonapriso.com/wp-content/uploads/2023/07/salle-banner-goldenhall2.png',
          'https://ayilaa.s3.eu-west-1.amazonaws.com/attraction/13650/media/675d96c1effa1_1734186689_467502392_8704983422917647_3126801040826012034_n.jpg',
        ],
      },
    ],
  },
  {
    user: { name: 'Bâches & Chaises Express', email: 'baches.express@tikly.demo', phone: '+237670000102' },
    businessName: 'Bâches & Chaises Express',
    description: 'Rental of chairs, tables and canopies with delivery and setup anywhere in Yaoundé and surroundings.',
    city: 'Yaoundé',
    whatsapp: '+237670000102',
    services: [
      {
        category: 'chairs',
        title: { en: 'Crystal & Chiavari chairs', fr: 'Chaises cristal & Chiavari' },
        description:
          'Transparent Napoleon and gold Chiavari chairs with cushions. Delivery and collection included from 100 chairs.',
        price: 500,
        unit: 'per_item',
        photos: [
          'https://site.glotelho.cm/media/catalog/product/cache/a58e2aabece67ef1697e83a3a038bdf7//c/h/chaises-de-f_te-resin---cristal-pur---avec-coussin---garantie-06-mois.jpg',
          'https://images.buildforlong.com/products/upload_20260917_083214_IMG-20260917-WA0008.jpg',
          'https://www.loc-housses.com/wp-content/uploads/2020/11/chiavari-ceruse.jpg',
        ],
      },
      {
        category: 'canopy',
        title: { en: 'Event canopies & marquees', fr: 'Bâches et chapiteaux événementiels' },
        description:
          'Pagoda tents (5x5 m) and long marquees with side walls, draping in your colours and setup by our crew.',
        price: 35000,
        unit: 'per_item',
        photos: [
          'https://images.coinafrique.com/6067238_uploaded_image1_1790695803.jpg',
          'https://www.giuliobarbieri.it/wp-content/uploads/2024/01/cameroun-giulio-barbieri-gazebo-eventi-pubblici-1024x768.jpg',
          'https://media.1000-annonces.com/8/7d/8b/large/1681401962_339970272760154719038085912281.jpg',
        ],
      },
    ],
  },
  {
    user: { name: 'Mboa Sound System', email: 'mboasound@tikly.demo', phone: '+237670000103' },
    businessName: 'Mboa Sound System',
    description:
      'Professional sound, stage and lighting for concerts, festivals and weddings, with experienced engineers and DJs.',
    city: 'Douala',
    whatsapp: '+237670000103',
    services: [
      {
        category: 'sound',
        title: { en: 'Concert stage sound & lights', fr: 'Sonorisation et éclairage de scène' },
        description:
          'Line-array PA, monitors, mixing desk, stage lighting and two sound engineers for outdoor events up to 5,000 people.',
        price: 1200000,
        unit: 'per_event',
        photos: [
          'https://www.almgproductions.com/images/supports/almg_sonorisation_concert.jpg',
          'https://www.cameroon-tribune.cm//administrateur/photo/normal_f89a761.jpg',
        ],
      },
      {
        category: 'sound',
        title: { en: 'DJ & party sound package', fr: 'Pack DJ et sonorisation soirée' },
        description: 'DJ with decks, speakers and party lighting for weddings, birthdays and private parties.',
        price: 150000,
        unit: 'per_event',
        photos: ['https://www.almgproductions.com/images/supports/almg_sono_dj.jpg'],
      },
    ],
  },
  {
    user: { name: 'Saveurs du Littoral', email: 'saveurs.littoral@tikly.demo', phone: '+237670000104' },
    businessName: 'Saveurs du Littoral Traiteur',
    description:
      'Caterer specialised in Cameroonian and continental buffets: ndolé, poulet DG, grilled fish, pastries and drinks service.',
    city: 'Douala',
    whatsapp: '+237670000104',
    services: [
      {
        category: 'catering',
        title: { en: 'Wedding & event buffet', fr: 'Buffet mariage et événement' },
        description:
          'Full buffet with starters, three main dishes, dessert and waiting staff. Price per guest, minimum 50 guests.',
        price: 8000,
        unit: 'per_item',
        photos: [
          'https://ayilaa.s3.eu-west-1.amazonaws.com/attraction/4537/media/66d98448c1260_1725531208_%20Service%20traiteur%20la%20mission%20%20(3).jpg',
          'https://presievent.com/wp-content/uploads/2024/03/photo_5319079184213076946_y-1.jpg',
        ],
      },
    ],
  },
  {
    user: { name: 'Élégance Déco Events', email: 'elegance.deco@tikly.demo', phone: '+237670000105' },
    businessName: 'Élégance Déco Events',
    description:
      'Wedding and event decoration: table settings, floral arrangements, traditional and modern stage backdrops.',
    city: 'Douala',
    whatsapp: '+237670000105',
    services: [
      {
        category: 'decoration',
        title: { en: 'Hall & table decoration', fr: 'Décoration de salle et de tables' },
        description:
          'Complete decoration of the venue: centrepieces, flowers, chair covers, draping and a themed stage backdrop.',
        price: 450000,
        unit: 'per_event',
        photos: [
          'https://aumboa.org/wp-content/uploads/2024/05/Table-mariee-deco-traditionnelle.webp',
          'https://ayilaa.s3.eu-west-1.amazonaws.com/attraction/11561/media/672263d11b556_1730307025_Salle%20De%20F%C3%AAte%20Arena%20(5).jpg',
          'https://www.loc-housses.com/wp-content/uploads/2020/11/chiavari-ceruse.jpg',
        ],
      },
    ],
  },
  {
    user: { name: 'Numerix Media', email: 'numerix.media@tikly.demo', phone: '+237670000106' },
    businessName: 'Numerix Media Studio',
    description:
      'Event photography and videography: weddings, concerts and corporate events, with photo books and same-day highlights.',
    city: 'Yaoundé',
    whatsapp: '+237670000106',
    services: [
      {
        category: 'other',
        title: { en: 'Event photography & video', fr: 'Photographie et vidéo événementielle' },
        description:
          'Two photographers and one videographer for the whole day, 300+ edited photos and a 5-minute highlight film.',
        price: 350000,
        unit: 'per_event',
        photos: [
          'https://numerix-info.com/wp-content/uploads/2025/04/Mariage-Lea-Samson.jpg',
          'https://numerix-info.com/wp-content/uploads/2025/03/Y4A0820-scaled.jpg',
          'https://numerix-info.com/wp-content/uploads/2022/07/mariage-jojo-coco.jpg',
        ],
      },
    ],
  },
];

const EXHIBITORS = [
  { name: 'Mama Ngono Kitchen', email: 'mamangono@tikly.demo', phone: '+237670000201' },
  { name: 'Kmer Wear Merch', email: 'kmerwear@tikly.demo', phone: '+237670000202' },
  { name: 'Ndop Artisans Collective', email: 'ndop.artisans@tikly.demo', phone: '+237670000203' },
  { name: 'Brasseries Demo Drinks', email: 'demodrinks@tikly.demo', phone: '+237670000204' },
  { name: 'Afro Beauty Corner', email: 'afrobeauty@tikly.demo', phone: '+237670000205' },
  { name: 'Wouri Tech Accessories', email: 'wouritech@tikly.demo', phone: '+237670000206' },
];

const HOUR = 60 * 60 * 1000;

async function fetchImage(url: string, attempt = 1): Promise<Buffer> {
  try {
    const res = await axios.get<ArrayBuffer>(url, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) TiklySeed/1.0' },
    });
    return Buffer.from(res.data);
  } catch (err) {
    if (attempt >= 4 || !axios.isAxiosError(err) || err.response?.status !== 429) throw err;
    await new Promise((resolve) => setTimeout(resolve, attempt * 10000));
    return fetchImage(url, attempt + 1);
  }
}

let passwordHash: Promise<string> | undefined;

async function upsertUser(
  user: { name: string; email: string; phone: string },
  role: 'organizer' | 'provider' | 'exhibitor' | 'attendee' | 'admin',
) {
  const existing = await UserModel.findOne({ email: user.email });
  if (existing) return existing;
  passwordHash ??= bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);
  return UserModel.create({ ...user, passwordHash: await passwordHash, role });
}

function registrationPdf(businessName: string, city: string) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 60 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.fontSize(20).text('Business Registration Certificate', { align: 'center' });
    doc.moveDown().fontSize(11).text('DEMO DOCUMENT - generated by the Tikly seed script', { align: 'center' });
    doc.moveDown(2).fontSize(13).text(`Business name: ${businessName}`);
    doc.text(`City: ${city}, Cameroon`);
    doc.text(`Registration no.: RC/DEMO/${Math.floor(Math.random() * 900000 + 100000)}`);
    doc.end();
  });
}

async function uploadPhotos(urls: string[]) {
  const uploaded: string[] = [];
  for (const url of urls) {
    try {
      uploaded.push((await uploadPublicImage(await fetchImage(url), 'services')).url);
    } catch (err) {
      console.error(`      photo failed ${url}:`, err instanceof Error ? err.message : err);
    }
  }
  return uploaded;
}

async function seedProvider(seed: ProviderSeed) {
  const user = await upsertUser(seed.user, 'provider');
  let provider = await ProviderModel.findOne({ userId: user._id });
  if (!provider) {
    const document = await uploadPrivateDocument(await registrationPdf(seed.businessName, seed.city), 'documents');
    provider = await ProviderModel.create({
      userId: user._id,
      businessName: seed.businessName,
      description: seed.description,
      city: seed.city,
      country: 'Cameroon',
      phone: seed.user.phone,
      whatsapp: seed.whatsapp,
      documents: [document.publicId],
      verification: 'verified',
    });
  }
  for (const service of seed.services) {
    const found = await ServiceModel.findOne({ providerId: provider._id, 'title.en': service.title.en });
    if (found) {
      console.log(`skip  ${seed.businessName} / ${service.title.en}`);
      continue;
    }
    const photos = await uploadPhotos(service.photos);
    await ServiceModel.create({ ...service, photos, providerId: provider._id, city: seed.city });
    console.log(`added ${seed.businessName} / ${service.title.en} (${photos.length} photos)`);
  }
}

async function seedEvent(organizerId: unknown, seed: EventSeed) {
  const found = await EventModel.findOne({ organizerId, 'title.en': seed.title.en });
  if (found) {
    console.log(`skip  ${seed.title.en}`);
    return;
  }
  const cover = await uploadPublicImage(await fetchImage(seed.coverSource), 'events');
  const startAt = new Date(seed.startAt);
  const endAt = new Date(startAt.getTime() + seed.durationHours * HOUR);
  const event = await EventModel.create({
    organizerId,
    title: seed.title,
    description: seed.description,
    category: seed.category,
    coverUrl: cover.url,
    venue: seed.venue,
    city: seed.city,
    country: 'Cameroon',
    startAt,
    endAt,
    status: 'published',
  });
  await TicketTierModel.insertMany(seed.tiers.map((tier) => ({ ...tier, eventId: event._id, salesEndAt: startAt })));
  await SlotModel.insertMany(seed.slots.map((slot) => ({ ...slot, eventId: event._id })));
  console.log(`added ${seed.title.en}`);
}

const TODAY_EVENT_TITLE = 'Ko-C Homecoming Concert';

const STAFF = [
  { name: 'Demo Scanner One', phone: '+237670000301', event: 'Ko-C Homecoming Concert' },
  { name: 'Demo Scanner Two', phone: '+237670000302', event: 'Ko-C Homecoming Concert' },
  { name: 'Tenor Gate Staff', phone: '+237670000303', event: 'Tenor Live in Yaoundé' },
  { name: 'Salatiel Gate Staff', phone: '+237670000304', event: 'Salatiel: Live & Unplugged' },
  { name: 'Dipanda Gate Staff', phone: '+237670000305', event: 'Charlotte Dipanda in Concert' },
  { name: 'Ngondo Gate Staff', phone: '+237670000306', event: 'Ngondo Festival' },
  { name: 'Race Gate Staff', phone: '+237670000307', event: 'Mount Cameroon Race of Hope' },
  { name: 'DOMAF Gate Staff', phone: '+237670000308', event: 'Douala Music Art Festival (DOMAF)' },
  { name: 'Bikutsi Gate Staff', phone: '+237670000309', event: 'Festi Bikutsi' },
  { name: 'CIMFEST Gate One', phone: '+237670000310', event: 'Cameroon International Music Festival (CIMFEST)' },
  { name: 'CIMFEST Gate Two', phone: '+237670000311', event: 'Cameroon International Music Festival (CIMFEST)' },
  { name: 'Ecrans Noirs Gate Staff', phone: '+237670000312', event: 'Écrans Noirs Film Festival' },
  { name: 'Canal 2Or Gate Staff', phone: '+237670000313', event: 'Canal 2’Or Awards Night' },
  { name: 'YAFE Gate Staff', phone: '+237670000314', event: 'Yaoundé en Fête (YA-FE)' },
];

function tonightInDouala(now = new Date()) {
  const target = new Date(now);
  target.setUTCHours(21, 0, 0, 0);
  if (target.getTime() - now.getTime() < 2 * HOUR) return new Date(now.getTime() + 2 * HOUR);
  return target;
}

async function moveEventToToday(organizerId: unknown) {
  const event = await EventModel.findOne({ organizerId, 'title.en': TODAY_EVENT_TITLE });
  if (!event) {
    console.error(`fail  today: event "${TODAY_EVENT_TITLE}" not found`);
    return;
  }
  const startAt = tonightInDouala();
  const sameDay = event.startAt.toISOString().slice(0, 10) === startAt.toISOString().slice(0, 10);
  if (sameDay && event.startAt > new Date()) {
    console.log(`today ${TODAY_EVENT_TITLE} already at ${event.startAt.toISOString()}`);
    return;
  }
  await TicketTierModel.updateMany({ eventId: event._id }, { salesEndAt: startAt });
  event.startAt = startAt;
  event.endAt = new Date(startAt.getTime() + 6 * HOUR);
  await event.save();
  console.log(`today ${TODAY_EVENT_TITLE} -> ${startAt.toISOString()}`);
}

async function seedStaff(organizerId: unknown) {
  for (const { event: title, ...member } of STAFF) {
    const event = await EventModel.findOne({ organizerId, 'title.en': title });
    if (!event) {
      console.error(`fail  staff: event "${title}" not found`);
      continue;
    }
    let staff = await UserModel.findOne({ phone: member.phone });
    if (!staff) {
      passwordHash ??= bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);
      staff = await UserModel.create({ ...member, passwordHash: await passwordHash, role: 'staff', organizerId });
    }
    await StaffAssignmentModel.updateOne(
      { staffId: staff._id, eventId: event._id },
      { $setOnInsert: { staffId: staff._id, eventId: event._id } },
      { upsert: true },
    );
    console.log(`staff ${member.phone} -> ${title}`);
  }
}

async function seedPosts(organizerId: unknown) {
  for (const [title, posts] of Object.entries(POSTS)) {
    const event = await EventModel.findOne({ organizerId, 'title.en': title });
    if (!event) {
      console.error(`fail  posts: event "${title}" not found`);
      continue;
    }
    let added = 0;
    for (const post of [...posts].reverse()) {
      if (await PostModel.exists({ eventId: event._id, 'title.en': post.title.en })) continue;
      const images: string[] = [];
      for (const url of post.images) {
        try {
          images.push((await uploadPublicImage(await fetchImage(url), 'posts')).url);
        } catch (err) {
          console.error(`      post image failed ${url}:`, err instanceof Error ? err.message : err);
        }
      }
      await PostModel.create({ ...post, images, eventId: event._id, authorId: organizerId });
      added += 1;
    }
    console.log(`posts ${title}: +${added}`);
  }
}

const DEMO_ATTENDEE = { name: 'Demo Attendee', email: 'attendee@tikly.demo', phone: '+237670000401' };
const DEMO_TICKETS = 3;

async function giveTickets(
  event: { _id: Types.ObjectId; organizerId?: unknown },
  tier: { _id: Types.ObjectId; price: number },
  holder: { _id: Types.ObjectId; phone: string; email?: string | null; name: string },
  wanted: number,
) {
  const owned = await TicketModel.countDocuments({
    eventId: event._id,
    holderId: holder._id,
    status: { $in: ['valid', 'checked_in'] },
  });
  const missing = wanted - owned;
  if (missing <= 0) return;
  const order = await OrderModel.create({
    type: 'ticket',
    buyerId: holder._id,
    payeeId: event.organizerId,
    eventId: event._id,
    items: [{ refId: tier._id, refModel: 'TicketTier', quantity: missing, unitPrice: tier.price }],
    amount: tier.price * missing,
    phone: holder.phone,
    status: 'paid',
    paidAt: new Date(),
  });
  const tickets = Array.from({ length: missing }, () => {
    const _id = new Types.ObjectId();
    return {
      _id,
      code: ticketCode(),
      qrToken: createQrToken(String(_id)),
      orderId: order._id,
      eventId: event._id,
      tierId: tier._id,
      holderId: holder._id,
    };
  });
  await TicketModel.insertMany(tickets);
  await TicketTierModel.updateOne({ _id: tier._id }, { $inc: { sold: missing } });
  console.log(`tickets ${holder.email ?? holder.name} +${missing}: ${tickets.map((ticket) => ticket.code).join(', ')}`);
}

async function seedDemoTickets(organizerId: unknown) {
  const event = await EventModel.findOne({ organizerId, 'title.en': TODAY_EVENT_TITLE });
  const tier = event && (await TicketTierModel.findOne({ eventId: event._id, name: 'standard' }));
  if (!event || !tier) {
    console.error(`fail  tickets: "${TODAY_EVENT_TITLE}" or its standard tier not found`);
    return;
  }
  const demo = await upsertUser(DEMO_ATTENDEE, 'attendee');
  const attendees = await UserModel.find({ role: 'attendee' });
  for (const attendee of attendees) {
    try {
      await giveTickets(event, tier, attendee, attendee._id.equals(demo._id) ? DEMO_TICKETS : 1);
    } catch (err) {
      console.error(`fail  tickets ${attendee.email ?? attendee.name}:`, err instanceof Error ? err.message : err);
    }
  }
  console.log(`tickets every attendee (${attendees.length}) holds a ${TODAY_EVENT_TITLE} ticket`);
}

async function main() {
  await connectDb();
  const organizer = await upsertUser(DEMO_ORGANIZER, 'organizer');
  console.log(`organiser ${organizer.email} (${organizer.id})`);
  const admin = await upsertUser(DEMO_ADMIN, 'admin');
  console.log(`admin ${admin.email}`);
  for (const seed of EVENTS) {
    try {
      await seedEvent(organizer._id, seed);
    } catch (err) {
      console.error(`fail  ${seed.title.en}:`, err instanceof Error ? err.message : err);
    }
  }
  for (const seed of PROVIDERS) {
    try {
      await seedProvider(seed);
    } catch (err) {
      console.error(`fail  ${seed.businessName}:`, err instanceof Error ? err.message : err);
    }
  }
  for (const exhibitor of EXHIBITORS) {
    const user = await upsertUser(exhibitor, 'exhibitor');
    console.log(`exhibitor ${user.email}`);
  }
  await moveEventToToday(organizer._id);
  await seedStaff(organizer._id);
  await seedDemoTickets(organizer._id);
  await seedPosts(organizer._id);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => disconnectDb());
