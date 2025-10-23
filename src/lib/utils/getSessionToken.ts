import { MCPSession } from '../../types/server.js';

const getSessionToken = (session?: MCPSession) => {
  return session?.token || '';
}

export default getSessionToken;