const { KnowledgeManager } = require('../../../knowledge/knowledge_manager');
const { Fact } = require('../../../knowledge/fact');

// Mock the database module
jest.mock('../../../utils/database', () => ({
  getDb: jest.fn(),
  query: jest.fn(),
  run: jest.fn(),
  get: jest.fn(),
  all: jest.fn(),
  exec: jest.fn()
}));

const database = require('../../../utils/database');

describe('KnowledgeManager', () => {
  let knowledgeManager;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock implementations
    database.getDb.mockResolvedValue({});
    database.run.mockResolvedValue({ lastID: 1 });
    database.get.mockResolvedValue(null);
    database.all.mockResolvedValue([]);
    database.query.mockResolvedValue({ lastID: 1 });
    database.exec.mockResolvedValue({ changes: 1 });
    
    knowledgeManager = new KnowledgeManager();
  });
  
  test('should initialize correctly', async () => {
    await knowledgeManager.initialize();
    
    expect(database.getDb).toHaveBeenCalled();
    expect(database.exec).toHaveBeenCalled();
  });
  
  test('should store facts', async () => {
    const fact = new Fact({
      type: 'requirement',
      content: {
        description: 'Agencies must report quarterly',
        responsibleEntity: 'Agency heads'
      },
      source: {
        id: 'eo12345',
        name: 'Executive Order 12345',
        type: 'executive_order'
      }
    });
    
    database.run.mockResolvedValueOnce({ lastID: 42 });
    
    const result = await knowledgeManager.storeFact(fact);
    
    expect(database.run).toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ id: 42 }));
  });
  
  test('should retrieve facts by order', async () => {
    const mockFacts = [
      {
        id: 1,
        type: 'requirement',
        content: JSON.stringify({
          description: 'First requirement',
          responsibleEntity: 'Agency heads'
        }),
        source_id: 'eo12345',
        source_name: 'Executive Order 12345',
        source_type: 'executive_order',
        confidence: 0.85,
        created_at: '2023-01-01T00:00:00.000Z'
      },
      {
        id: 2,
        type: 'impact',
        content: JSON.stringify({
          description: 'First impact',
          affectedArea: 'Research'
        }),
        source_id: 'eo12345',
        source_name: 'Executive Order 12345',
        source_type: 'executive_order',
        confidence: 0.78,
        created_at: '2023-01-01T00:00:00.000Z'
      }
    ];
    
    database.all.mockResolvedValueOnce(mockFacts);
    
    const facts = await knowledgeManager.getFactsForOrder('eo12345');
    
    expect(database.all).toHaveBeenCalled();
    expect(facts).toHaveLength(2);
    expect(facts[0]).toBeInstanceOf(Fact);
    expect(facts[0].type).toBe('requirement');
    expect(facts[1].type).toBe('impact');
  });
  
  test('should retrieve fact by id', async () => {
    const mockFact = {
      id: 42,
      type: 'requirement',
      content: JSON.stringify({
        description: 'Test requirement',
        responsibleEntity: 'Agency heads'
      }),
      source_id: 'eo12345',
      source_name: 'Executive Order 12345',
      source_type: 'executive_order',
      confidence: 0.85,
      created_at: '2023-01-01T00:00:00.000Z'
    };
    
    database.get.mockResolvedValueOnce(mockFact);
    
    const fact = await knowledgeManager.getFactById(42);
    
    expect(database.get).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM facts WHERE id = ?'), [42]);
    expect(fact).toBeInstanceOf(Fact);
    expect(fact.id).toBe(42);
    expect(fact.type).toBe('requirement');
  });
  
  test('should update existing facts', async () => {
    const fact = new Fact({
      id: 42,
      type: 'requirement',
      content: {
        description: 'Updated requirement',
        responsibleEntity: 'Agency heads'
      },
      source: {
        id: 'eo12345',
        name: 'Executive Order 12345',
        type: 'executive_order'
      },
      confidence: 0.9
    });
    
    await knowledgeManager.updateFact(fact);
    
    expect(database.run).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE facts SET'),
      expect.arrayContaining(['requirement', expect.any(String), 0.9, 42])
    );
  });
  
  test('should search facts', async () => {
    const mockFacts = [
      {
        id: 1,
        type: 'requirement',
        content: JSON.stringify({
          description: 'Quarterly reporting requirement',
          responsibleEntity: 'Agency heads'
        }),
        source_id: 'eo12345',
        source_name: 'Executive Order 12345',
        source_type: 'executive_order',
        confidence: 0.85,
        created_at: '2023-01-01T00:00:00.000Z'
      }
    ];
    
    database.all.mockResolvedValueOnce(mockFacts);
    
    const facts = await knowledgeManager.searchFacts({
      query: 'quarterly',
      types: ['requirement'],
      minConfidence: 0.8
    });
    
    expect(database.all).toHaveBeenCalled();
    expect(facts).toHaveLength(1);
    expect(facts[0].content.description).toContain('Quarterly');
  });
  
  test('should find contradictions', async () => {
    // Mock facts with contradictory information
    const mockFacts = [
      {
        id: 1,
        type: 'date',
        content: JSON.stringify({
          type: 'deadline',
          date: '2023-03-01',
          description: 'Compliance deadline'
        }),
        source_id: 'eo12345',
        source_name: 'Executive Order 12345',
        source_type: 'executive_order',
        confidence: 0.85,
        created_at: '2023-01-01T00:00:00.000Z'
      },
      {
        id: 2,
        type: 'date',
        content: JSON.stringify({
          type: 'deadline',
          date: '2023-04-15',
          description: 'Compliance deadline'
        }),
        source_id: 'nih_notice',
        source_name: 'NIH Notice',
        source_type: 'agency_guidance',
        confidence: 0.9,
        created_at: '2023-01-15T00:00:00.000Z'
      }
    ];
    
    database.all.mockResolvedValueOnce(mockFacts);
    
    const contradictions = await knowledgeManager.findContradictions({
      orderId: 'eo12345',
      types: ['date']
    });
    
    expect(database.all).toHaveBeenCalled();
    expect(contradictions).toHaveLength(1);
    expect(contradictions[0]).toEqual(expect.objectContaining({
      type: 'date_contradiction',
      facts: expect.arrayContaining([
        expect.objectContaining({ id: 1 }),
        expect.objectContaining({ id: 2 })
      ])
    }));
  });
  
  test('should handle database errors', async () => {
    database.run.mockRejectedValueOnce(new Error('Database error'));
    
    const fact = new Fact({
      type: 'requirement',
      content: {
        description: 'Test requirement'
      },
      source: {
        id: 'eo12345',
        name: 'Executive Order 12345',
        type: 'executive_order'
      }
    });
    
    await expect(knowledgeManager.storeFact(fact)).rejects.toThrow('Database error');
  });
});