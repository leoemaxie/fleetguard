import { faker } from '@faker-js/faker'
import { db } from '../../src/db/client.js'
import {
  alerts,
  drivers,
  gpsEvents,
  routes,
  tenants,
  trips,
  users,
  vehicles,
} from '../../src/db/schema/index.js'

function plateNumber(): string {
  const letters = faker.string.alpha({ length: 3, casing: 'upper' })
  const nums = faker.string.numeric(3)
  const suffix = faker.string.alpha({ length: 2, casing: 'upper' })
  return `${letters}-${nums}-${suffix}`
}

const tenantNames = ['Dangote Transport Lagos', 'Ekesons Logistics']
const vehicleModels = [
  { make: 'Toyota', model: 'Hilux' },
  { make: 'Hino', model: '700 Series' },
  { make: 'Mitsubishi', model: 'Fuso' },
]
const routeTemplates = [
  {
    name: 'Apapa Port to Ibadan',
    originName: 'Apapa Port Gate 3',
    destinationName: 'Ibadan Distribution Centre',
  },
  {
    name: 'Lagos Island to Ota',
    originName: 'Marina CMS',
    destinationName: 'Ota Industrial Park',
  },
  {
    name: 'Ikorodu to Sagamu',
    originName: 'Ikorodu Garage',
    destinationName: 'Sagamu Interchange',
  },
]

const firstNames = [
  'Adebayo',
  'Chinedu',
  'Kehinde',
  'Ngozi',
  'Ifeanyi',
  'Temitope',
  'Uche',
  'Bolanle',
  'Emeka',
  'Kelechi',
]
const lastNames = [
  'Afolabi',
  'Okonkwo',
  'Adeyemi',
  'Nwankwo',
  'Balogun',
  'Obi',
  'Akinola',
  'Eze',
]

async function seed(): Promise<void> {
  for (const name of tenantNames) {
    const [tenant] = await db
      .insert(tenants)
      .values({ name, maxVehicles: 50 })
      .returning()
    if (!tenant) {
      continue
    }

    for (let i = 0; i < 3; i += 1) {
      await db.insert(users).values({
        tenantId: tenant.id,
        email: `manager${i + 1}.${tenant.id.slice(0, 6)}@fleetguard.ng`,
        passwordHash:
          '$2a$12$Z0ruH2pH92f5weX5fM8f0u0ckM4rWcBv3JUxJ8Q8QkMAnmMyN0pq2',
        role: 'fleet_manager',
        firstName: faker.helpers.arrayElement(firstNames),
        lastName: faker.helpers.arrayElement(lastNames),
        isActive: true,
      })
    }

    const tenantDrivers: string[] = []
    for (let i = 0; i < 8; i += 1) {
      const [driver] = await db
        .insert(drivers)
        .values({
          tenantId: tenant.id,
          firstName: faker.helpers.arrayElement(firstNames),
          lastName: faker.helpers.arrayElement(lastNames),
          licenseNumber: `NIG-${faker.string.alphanumeric(8).toUpperCase()}`,
          phoneNumber: `+23480${faker.string.numeric(8)}`,
          isActive: true,
        })
        .returning()
      if (driver) {
        tenantDrivers.push(driver.id)
      }
    }

    const tenantRoutes: string[] = []
    for (const template of routeTemplates) {
      const [route] = await db
        .insert(routes)
        .values({
          tenantId: tenant.id,
          name: template.name,
          originName: template.originName,
          destinationName: template.destinationName,
          corridorWidthMetres: 500,
          distanceKm: String(
            faker.number.float({ min: 25, max: 140, fractionDigits: 2 }),
          ),
        })
        .returning()
      if (route) {
        tenantRoutes.push(route.id)
      }
    }

    const tenantVehicles: string[] = []
    for (let i = 0; i < 10; i += 1) {
      const model = faker.helpers.arrayElement(vehicleModels)
      const [vehicle] = await db
        .insert(vehicles)
        .values({
          tenantId: tenant.id,
          plateNumber: plateNumber(),
          make: model.make,
          model: model.model,
          year: faker.number.int({ min: 2012, max: 2024 }),
          fuelTankCapacityLitres: String(
            faker.number.float({ min: 60, max: 450, fractionDigits: 2 }),
          ),
          assignedDriverId: faker.helpers.arrayElement(tenantDrivers),
          status: 'active',
        })
        .returning()
      if (vehicle) {
        tenantVehicles.push(vehicle.id)
      }
    }

    for (let i = 0; i < 50; i += 1) {
      const start = faker.date.recent({ days: 20 })
      const end = faker.date.soon({ days: 1, refDate: start })
      const [trip] = await db
        .insert(trips)
        .values({
          tenantId: tenant.id,
          vehicleId: faker.helpers.arrayElement(tenantVehicles),
          driverId: faker.helpers.arrayElement(tenantDrivers),
          routeId: faker.helpers.arrayElement(tenantRoutes),
          startTime: start,
          endTime: end,
          status: 'completed',
          totalDistanceKm: String(
            faker.number.float({ min: 8, max: 220, fractionDigits: 2 }),
          ),
          totalFuelUsedLitres: String(
            faker.number.float({ min: 2, max: 90, fractionDigits: 2 }),
          ),
          complianceScore: String(
            faker.number.float({ min: 65, max: 100, fractionDigits: 2 }),
          ),
        })
        .returning()

      if (!trip) {
        continue
      }

      for (let point = 0; point < 10; point += 1) {
        await db.insert(gpsEvents).values({
          tenantId: tenant.id,
          vehicleId: trip.vehicleId,
          tripId: trip.id,
          ts: faker.date.between({ from: start, to: end }),
          lat: String(faker.location.latitude({ min: 6.3, max: 7.5 })),
          lon: String(faker.location.longitude({ min: 3.0, max: 4.0 })),
          speedKph: String(
            faker.number.float({ min: 0, max: 95, fractionDigits: 2 }),
          ),
          headingDeg: faker.number.int({ min: 0, max: 359 }),
          altitudeM: String(
            faker.number.float({ min: 2, max: 120, fractionDigits: 2 }),
          ),
          serverTs: faker.date.between({ from: start, to: end }),
        })
      }
    }

    for (let i = 0; i < 20; i += 1) {
      await db.insert(alerts).values({
        tenantId: tenant.id,
        vehicleId: faker.helpers.arrayElement(tenantVehicles),
        driverId: faker.helpers.arrayElement(tenantDrivers),
        type: faker.helpers.arrayElement([
          'fuel_anomaly',
          'idle_excess',
          'private_use',
          'geofence_breach',
        ]),
        severity: faker.helpers.arrayElement(['critical', 'warning', 'info']),
        ts: faker.date.recent({ days: 7 }),
        lat: String(faker.location.latitude({ min: 6.3, max: 7.5 })),
        lon: String(faker.location.longitude({ min: 3.0, max: 4.0 })),
        description: faker.helpers.arrayElement([
          'Unexpected fuel drawdown on expressway segment.',
          'Vehicle deviated from corridor near Sagamu.',
          'Engine idle exceeded configured threshold.',
          'Trip movement detected outside operating window.',
        ]),
      })
    }
  }
}

void seed()
