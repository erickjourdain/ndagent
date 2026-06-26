import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClausierController, Clause } from './clausier.controller.js';
import fs from 'fs/promises';

// Mock fs/promises
vi.mock('fs/promises', () => {
  return {
    default: {
      readFile: vi.fn(),
      writeFile: vi.fn()
    }
  };
});

describe('ClausierController', () => {
  const originalEnv = process.env;

  const mockResponse = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  };

  const mockRequest = (body: any = {}, params: any = {}, query: any = {}, headers: any = {}) => {
    return {
      body,
      params,
      query,
      headers
    } as any;
  };

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
  });

  describe('verifyAdmin', () => {
    it('should call next() if password matches ADMIN_PASSWORD', () => {
      process.env.ADMIN_PASSWORD = 'super-secret-password';
      const req = mockRequest({}, {}, {}, { 'x-admin-password': 'super-secret-password' });
      const res = mockResponse();
      const next = vi.fn();

      ClausierController.verifyAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should call next() if password matches default admin123 when ADMIN_PASSWORD is unset', () => {
      delete process.env.ADMIN_PASSWORD;
      const req = mockRequest({ password: 'admin123' });
      const res = mockResponse();
      const next = vi.fn();

      ClausierController.verifyAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 401 if password does not match', () => {
      process.env.ADMIN_PASSWORD = 'correct-pwd';
      const req = mockRequest({ password: 'wrong-pwd' });
      const res = mockResponse();
      const next = vi.fn();

      ClausierController.verifyAdmin(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Mot de passe administrateur incorrect.' });
    });
  });

  describe('verify', () => {
    it('should return 200 success if password matches', async () => {
      process.env.ADMIN_PASSWORD = 'abc';
      const req = mockRequest({ password: 'abc' });
      const res = mockResponse();

      await ClausierController.verify(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    it('should return 401 if password mismatches', async () => {
      process.env.ADMIN_PASSWORD = 'abc';
      const req = mockRequest({ password: '123' });
      const res = mockResponse();

      await ClausierController.verify(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Mot de passe administrateur incorrect.' });
    });
  });

  describe('getClauses', () => {
    it('should return clauses list and fallback to defaults', async () => {
      const mockClausesList: Clause[] = [
        { id: '1', name: 'N1', description: 'D1', criticality: 'Low', active: true },
        { id: '2', name: 'N2', description: 'D2', criticality: 'Medium', active: false }
      ];

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({ clauses: mockClausesList }));

      const req = mockRequest({}, {}, { language: 'fr' });
      const res = mockResponse();

      await ClausierController.getClauses(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([
        { id: '1', name: 'N1', description: 'D1', criticality: 'Low', active: true },
        { id: '2', name: 'N2', description: 'D2', criticality: 'Medium', active: false }
      ]);
    });
  });

  describe('createClause', () => {
    it('should reject if missing fields', async () => {
      const req = mockRequest({ id: '1', name: 'Name' }); // missing description, criticality
      const res = mockResponse();

      await ClausierController.createClause(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Tous les champs sont requis (id, name, description, criticality).' });
    });

    it('should reject if ID already exists', async () => {
      const mockClausesList: Clause[] = [
        { id: 'obj-clause', name: 'N1', description: 'D1', criticality: 'Low', active: true }
      ];
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({ clauses: mockClausesList }));

      const req = mockRequest({ id: 'OBJ-CLAUSE', name: 'New Name', description: 'New Desc', criticality: 'Medium' });
      const res = mockResponse();

      await ClausierController.createClause(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Une clause avec l\'identifiant "OBJ-CLAUSE" existe déjà.' });
    });

    it('should create new clause successfully and write to disk', async () => {
      const mockClausesList: Clause[] = [
        { id: 'c1', name: 'N1', description: 'D1', criticality: 'Low', active: true }
      ];
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({ clauses: mockClausesList }));

      const req = mockRequest({ id: 'c2', name: 'N2', description: 'D2', criticality: 'High' });
      const res = mockResponse();

      await ClausierController.createClause(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        id: 'c2',
        name: 'N2',
        description: 'D2',
        criticality: 'High',
        active: true
      });
      expect(fs.writeFile).toHaveBeenCalled();
    });
  });

  describe('deactivateClause', () => {
    it('should return 404 if clause not found', async () => {
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({ clauses: [] }));
      const req = mockRequest({}, { id: 'unknown' });
      const res = mockResponse();

      await ClausierController.deactivateClause(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'La clause avec l\'identifiant "unknown" n\'existe pas.' });
    });

    it('should deactivate clause successfully and write to disk', async () => {
      const mockClausesList: Clause[] = [
        { id: 'c1', name: 'N1', description: 'D1', criticality: 'Low', active: true }
      ];
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({ clauses: mockClausesList }));
      const req = mockRequest({}, { id: 'c1' });
      const res = mockResponse();

      await ClausierController.deactivateClause(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        id: 'c1',
        name: 'N1',
        description: 'D1',
        criticality: 'Low',
        active: false
      });
      expect(fs.writeFile).toHaveBeenCalled();
    });
  });

  describe('reactivateClause', () => {
    it('should reactivate clause successfully and write to disk', async () => {
      const mockClausesList: Clause[] = [
        { id: 'c1', name: 'N1', description: 'D1', criticality: 'Low', active: false }
      ];
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({ clauses: mockClausesList }));
      const req = mockRequest({}, { id: 'c1' });
      const res = mockResponse();

      await ClausierController.reactivateClause(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        id: 'c1',
        name: 'N1',
        description: 'D1',
        criticality: 'Low',
        active: true
      });
      expect(fs.writeFile).toHaveBeenCalled();
    });
  });

  describe('updateClause', () => {
    it('should deactivate the old version and create a new versioned copy', async () => {
      const mockClausesList: Clause[] = [
        { id: 'clause_test', name: 'Old Name', description: 'Old Desc', criticality: 'Low', active: true }
      ];
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({ clauses: mockClausesList }));
      const req = mockRequest(
        { name: 'New Name', description: 'New Desc', criticality: 'Medium' },
        { id: 'clause_test' }
      );
      const res = mockResponse();

      await ClausierController.updateClause(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseJson = res.json.mock.calls[0][0];

      expect(responseJson.oldClause.id).toBe('clause_test');
      expect(responseJson.oldClause.active).toBe(false);

      expect(responseJson.newClause.id).toBe('clause_test_v2');
      expect(responseJson.newClause.name).toBe('New Name');
      expect(responseJson.newClause.criticality).toBe('Medium');
      expect(responseJson.newClause.active).toBe(true);

      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should correctly increment version suffix if it already exists', async () => {
      const mockClausesList: Clause[] = [
        { id: 'c1_v2', name: 'N1 v2', description: 'D1 v2', criticality: 'Medium', active: true }
      ];
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({ clauses: mockClausesList }));
      const req = mockRequest(
        { name: 'N1 v3', description: 'D1 v3', criticality: 'High' },
        { id: 'c1_v2' }
      );
      const res = mockResponse();

      await ClausierController.updateClause(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseJson = res.json.mock.calls[0][0];

      expect(responseJson.oldClause.id).toBe('c1_v2');
      expect(responseJson.oldClause.active).toBe(false);

      expect(responseJson.newClause.id).toBe('c1_v3');
      expect(fs.writeFile).toHaveBeenCalled();
    });
  });
});
