import { faker } from '@faker-js/faker'

export function fakeUuid(): string {
  return faker.string.uuid()
}

export function fakeEmail(): string {
  return faker.internet.email().toLowerCase()
}

export function fakePlate(): string {
  return `${faker.string.alpha({ length: 3, casing: 'upper' })}-${faker.string.numeric(3)}-${faker.string.alpha({ length: 2, casing: 'upper' })}`
}
