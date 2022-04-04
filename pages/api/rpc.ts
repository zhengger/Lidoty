import type { NextApiRequest, NextApiResponse } from 'next';
import { getRPCUrls } from '@lido-sdk/fetch';
import { CHAINS } from '@lido-sdk/constants';
import getConfig from 'next/config';
import { DEFAULT_API_ERROR_MESSAGE } from 'config';
import { fetchWithFallbacks } from 'utils/fetchWithFallbacks';
import { serverLogger } from 'utils/serverLogger';

const { serverRuntimeConfig } = getConfig();
const { infuraApiKey, alchemyApiKey, apiProviderUrls } =
  serverRuntimeConfig as RuntimeConfig;

type Rpc = (req: NextApiRequest, res: NextApiResponse) => Promise<void>;

const rpc: Rpc = async (req, res) => {
  serverLogger.debug('Request to RPC');
  try {
    const chainId = Number(req.query.chainId);

    if (!CHAINS[chainId]) {
      throw new Error(`Chain ${chainId} is not supported`);
    }

    const urls = getRPCUrls(chainId, {
      infura: infuraApiKey,
      alchemy: alchemyApiKey,
    });

    const customProvider = apiProviderUrls?.[chainId];

    if (customProvider) {
      urls.unshift(customProvider);
    }

    const requested = await fetchWithFallbacks(urls, {
      method: 'POST',
      // Next by default parses our body for us, we don't want that here
      body: JSON.stringify(req.body),
    });

    const responded = await requested.json();

    res.status(requested.status).json(responded);
  } catch (error) {
    serverLogger.error(error);
    if (error instanceof Error) {
      res.status(500).json(error.message ?? DEFAULT_API_ERROR_MESSAGE);
    } else {
      res.status(500).json(DEFAULT_API_ERROR_MESSAGE);
    }
  }
};

export default rpc;
