import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Use CommonJS require for now
const { db } = require('./server/db.ts');
const { 
  users, 
  employees, 
  clients, 
  deals, 
  tasks, 
  workSessions 
} = require('./shared/schema.ts');

// Turkish client names
const turkishClients = [
  { firstName: 'Ayşe', lastName: 'Yılmaz', email: 'ayse.yilmaz@email.com', company: 'Beauty Istanbul' },
  { firstName: 'Mehmet', lastName: 'Demir', email: 'mehmet.demir@email.com', company: 'Ankara Spa' },
  { firstName: 'Fatma', lastName: 'Kaya', email: 'fatma.kaya@email.com', company: 'Izmir Beauty Center' },
  { firstName: 'Ali', lastName: 'Şahin', email: 'ali.sahin@email.com', company: 'Bursa Wellness' },
  { firstName: 'Zeynep', lastName: 'Özkan', email: 'zeynep.ozkan@email.com', company: 'Antalya Beauty' },
  { firstName: 'Mustafa', lastName: 'Çelik', email: 'mustafa.celik@email.com', company: 'Adana Cosmetics' },
  { firstName: 'Elif', lastName: 'Arslan', email: 'elif.arslan@email.com', company: 'Trabzon Beauty' },
  { firstName: 'Burak', lastName: 'Doğan', email: 'burak.dogan@email.com', company: 'Eskişehir Spa' },
  { firstName: 'Seda', lastName: 'Yıldız', email: 'seda.yildiz@email.com', company: 'Konya Beauty' },
  { firstName: 'Emre', lastName: 'Aydın', email: 'emre.aydin@email.com', company: 'Gaziantep Wellness' },
  { firstName: 'Gizem', lastName: 'Polat', email: 'gizem.polat@email.com', company: 'Mersin Beauty Hub' },
  { firstName: 'Cem', lastName: 'Güler', email: 'cem.guler@email.com', company: 'Kayseri Spa Center' },
  { firstName: 'Deniz', lastName: 'Korkmaz', email: 'deniz.korkmaz@email.com', company: 'Samsun Beauty' },
  { firstName: 'Sevgi', lastName: 'Tunç', email: 'sevgi.tunc@email.com', company: 'Diyarbakır Cosmetics' },
  { firstName: 'Serkan', lastName: 'Başak', email: 'serkan.basak@email.com', company: 'Malatya Wellness' },
  { firstName: 'Pınar', lastName: 'Erdoğan', email: 'pinar.erdogan@email.com', company: 'Van Beauty Center' },
  { firstName: 'Oğuz', lastName: 'Çiftçi', email: 'oguz.ciftci@email.com', company: 'Erzurum Spa' },
  { firstName: 'Başak', lastName: 'Acar', email: 'basak.acar@email.com', company: 'Şanlıurfa Beauty' },
  { firstName: 'Kerem', lastName: 'Yücel', email: 'kerem.yucel@email.com', company: 'Hatay Cosmetics' },
  { firstName: 'İrem', lastName: 'Koç', email: 'irem.koc@email.com', company: 'Çanakkale Wellness' }
];

// Deal types and statuses
const dealTypes = [
  'Hair treatment package', 'Facial care program', 'Body massage therapy', 
  'Nail art service', 'Eyebrow shaping', 'Skin rejuvenation', 
  'Anti-aging treatment', 'Wedding beauty package', 'Spa day experience',
  'Laser hair removal', 'Chemical peel service', 'Botox treatment',
  'Dermaplaning session', 'Microblading service', 'Lash extensions',
  'Permanent makeup', 'Cellulite treatment', 'Weight loss program',
  'Nutrition consultation', 'Wellness coaching'
];

const taskTypes = [
  'Call client for appointment', 'Prepare treatment plan', 'Order beauty supplies',
  'Schedule follow-up consultation', 'Send treatment aftercare instructions',
  'Update client preferences', 'Process payment', 'Book next session',
  'Review treatment results', 'Conduct skin analysis', 'Plan beauty regimen',
  'Coordinate with specialist', 'Prepare client file', 'Send reminder SMS',
  'Update inventory', 'Check equipment maintenance', 'Train new technique',
  'Research new products', 'Create marketing content', 'Plan promotional campaign'
];

async function seedTestData() {
  console.log('Starting to seed test data...');

  try {
    // Get all existing users
    const existingUsers = await db.select().from(users);
    console.log(`Found ${existingUsers.length} existing users`);

    if (existingUsers.length === 0) {
      console.log('No users found. Please create users first.');
      return;
    }

    // Create clients for each user (max 20 per user)
    for (let userIndex = 0; userIndex < existingUsers.length; userIndex++) {
      const user = existingUsers[userIndex];
      const clientCount = Math.min(20, turkishClients.length);
      
      console.log(`Creating ${clientCount} clients for user ${user.firstName} ${user.lastName}`);
      
      const userClients = [];
      for (let i = 0; i < clientCount; i++) {
        const client = turkishClients[i];
        const newClient = await db.insert(clients).values({
          name: `${client.firstName} ${client.lastName}`,
          email: client.email,
          phone: `+90 5${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
          company: client.company,
          source: ['website', 'instagram', 'referral', 'email', 'phone', 'other'][Math.floor(Math.random() * 6)],
          status: ['new', 'contacted', 'qualified', 'opportunity', 'customer', 'inactive'][Math.floor(Math.random() * 6)],
          assignedTo: user.id,
          notes: `Turkish beauty client from ${client.company}. Interested in premium services.`
        }).returning();
        
        userClients.push(newClient[0]);
      }

      // Create deals for each user (max 20)
      console.log(`Creating deals for user ${user.firstName} ${user.lastName}`);
      const userDeals = [];
      for (let i = 0; i < Math.min(20, userClients.length); i++) {
        const client = userClients[i];
        const dealType = dealTypes[Math.floor(Math.random() * dealTypes.length)];
        const value = Math.floor(Math.random() * 5000) + 500; // $500-$5500
        
        const newDeal = await db.insert(deals).values({
          title: `${dealType} - ${client.name}`,
          description: `${dealType} service for ${client.company}. Premium beauty treatment package.`,
          value: value.toString(),
          stage: ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'][Math.floor(Math.random() * 7)],
          assignedTo: user.id,
          clientId: client.id,
          expectedCloseDate: new Date(2025, 8 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 28) + 1),
          priority: ['low', 'medium', 'high', 'urgent'][Math.floor(Math.random() * 4)]
        }).returning();
        
        userDeals.push(newDeal[0]);
      }

      // Create tasks for each user (max 20)
      console.log(`Creating tasks for user ${user.firstName} ${user.lastName}`);
      for (let i = 0; i < Math.min(20, userClients.length); i++) {
        const client = userClients[i];
        const task = taskTypes[Math.floor(Math.random() * taskTypes.length)];
        
        await db.insert(tasks).values({
          title: `${task} - ${client.name}`,
          description: `${task} for ${client.company}. Follow up on beauty service requirements.`,
          status: ['open', 'in_progress', 'completed', 'overdue'][Math.floor(Math.random() * 4)],
          priority: ['low', 'medium', 'high', 'urgent'][Math.floor(Math.random() * 4)],
          assignedTo: user.id,
          clientId: client.id,
          dueDate: new Date(2025, 8, Math.floor(Math.random() * 31) + 1)
        });
      }

      // Create work sessions for August 2025
      console.log(`Creating work sessions for August 2025 for user ${user.firstName} ${user.lastName}`);
      for (let day = 1; day <= 31; day++) {
        // Skip weekends
        const date = new Date(2025, 7, day); // August 2025
        if (date.getDay() === 0 || date.getDay() === 6) continue;
        
        // Random chance of working (90% chance)
        if (Math.random() < 0.1) continue;
        
        const loginTime = new Date(2025, 7, day, 8 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60));
        const workMinutes = 480 + Math.floor(Math.random() * 120); // 8-10 hours
        const logoutTime = new Date(loginTime.getTime() + workMinutes * 60000);
        
        await db.insert(workSessions).values({
          userId: user.id,
          loginTime: loginTime,
          logoutTime: logoutTime,
          totalMinutes: workMinutes,
          date: new Date(2025, 7, day)
        });
      }
    }

    console.log('Test data seeded successfully!');
  } catch (error) {
    console.error('Error seeding test data:', error);
  }
}

seedTestData();