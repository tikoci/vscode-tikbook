import { strict as assert } from 'assert'
import type { RouterRestClient } from '../../../src/routeros'
import { SchemaMapper } from '../../../src/schema-mapper'
import type { SchemaEntry } from '../../../src/scriptfs-schema'

interface MockClientOptions {
  listData?: unknown[]
  getData?: Record<string, unknown>
  getError?: Error
  inspectData?: unknown[]
  resolveId?: string
}

class MockClient {
  private listData: unknown[]
  private getData?: Record<string, unknown>
  private getError?: Error
  private inspectData: unknown[]
  private resolveId?: string

  public listCalls = 0
  public getCalls = 0

  constructor(options: MockClientOptions) {
    this.listData = options.listData ?? []
    this.getData = options.getData
    this.getError = options.getError
    this.inspectData = options.inspectData ?? []
    this.resolveId = options.resolveId
  }

  list(_path: string, _body?: Record<string, unknown>): Promise<unknown[]> {
    this.listCalls += 1
    return Promise.resolve(this.listData)
  }

  get(_path: string, _idOrName: string): Promise<unknown> {
    this.getCalls += 1
    if (this.getError) return Promise.reject(this.getError)
    return Promise.resolve(this.getData ?? {})
  }

  create(_path: string, _payload: Record<string, unknown>): Promise<unknown> {
    return Promise.resolve({ ok: true })
  }

  update(_path: string, _id: string, _patch: Record<string, unknown>): Promise<unknown> {
    return Promise.resolve({ ok: true })
  }

  remove(_path: string, _id: string): Promise<unknown> {
    return Promise.resolve({ ok: true })
  }

  resolveIdByName(_path: string, _name: string, _nameAttr?: string): Promise<string | undefined> {
    return Promise.resolve(this.resolveId)
  }

  _inspect(_request: string, _input: string, _path?: string): Promise<unknown[]> {
    return Promise.resolve(this.inspectData)
  }
}

const baseSchema: SchemaEntry = {
  path: '/system/script',
  nameAttr: 'name',
  scriptAttrs: ['source'],
}

suite('SchemaMapper', () => {
  test('listItems returns items from client', async () => {
    const client = new MockClient({ listData: [{ '.id': 'a1' }] })
    const mapper = new SchemaMapper(client as unknown as RouterRestClient, baseSchema)
    const items = await mapper.listItems()

    assert.equal(items.length, 1)
    assert.equal(client.listCalls, 1)
  })

  test('getItem returns item from direct get', async () => {
    const client = new MockClient({ getData: { name: 'alpha' } })
    const mapper = new SchemaMapper(client as unknown as RouterRestClient, baseSchema)
    const item = await mapper.getItem('alpha')

    assert.equal(item?.name, 'alpha')
    assert.equal(client.getCalls, 1)
  })

  test('getItem falls back to list matching name or id', async () => {
    const client = new MockClient({
      getError: new Error('not found'),
      listData: [{ '.id': 'id-1', name: 'beta' }],
    })
    const mapper = new SchemaMapper(client as unknown as RouterRestClient, baseSchema)

    const byName = await mapper.getItem('beta')
    assert.equal(byName?.name, 'beta')

    const byId = await mapper.getItem('id-1')
    assert.equal(byId?.['.id'], 'id-1')
  })

  test('resolveIdByName returns client value', async () => {
    const client = new MockClient({ resolveId: 'id-9' })
    const mapper = new SchemaMapper(client as unknown as RouterRestClient, baseSchema)

    const id = await mapper.resolveIdByName('gamma')
    assert.equal(id, 'id-9')
  })

  test('inspectPathExists reflects inspect results', async () => {
    const missingClient = new MockClient({ inspectData: [] })
    const existingClient = new MockClient({ inspectData: [{ name: 'child' }] })

    const missingMapper = new SchemaMapper(missingClient as unknown as RouterRestClient, baseSchema)
    const existingMapper = new SchemaMapper(existingClient as unknown as RouterRestClient, baseSchema)

    assert.equal(await missingMapper.inspectPathExists(), false)
    assert.equal(await existingMapper.inspectPathExists(), true)
  })
})
