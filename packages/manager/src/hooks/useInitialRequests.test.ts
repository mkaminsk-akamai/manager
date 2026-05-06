import { renderHook, waitFor } from '@testing-library/react';
import * as reactRedux from 'react-redux';

import { getStorage, setStorage, storage } from 'src/utilities/storage';

import { useInitialRequests } from './useInitialRequests';

vi.stubEnv('REACT_APP_CLIENT_ID', 'test-client-id');
vi.stubEnv('REACT_APP_LOGIN_ROOT', 'https://login.test');

const queryClientMock = {
  prefetchQuery: vi.fn().mockResolvedValue(undefined),
};

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useQueryClient: () => queryClientMock,
  };
});

const oauthMocks = vi.hoisted(() => ({
  clearStorageAndRedirectToLogout: vi.fn(),
  redirectToLogin: vi.fn(),
}));

vi.mock('src/OAuth/oauth', async () => {
  const actual = await vi.importActual('src/OAuth/oauth');
  return {
    ...actual,
    clearStorageAndRedirectToLogout: oauthMocks.clearStorageAndRedirectToLogout,
    redirectToLogin: oauthMocks.redirectToLogin,
  };
});

describe('OAuth token verification and initial data fetch', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    storage.authentication.token.clear();
    localStorage.removeItem('authentication/parent_token/token');
    vi.mocked(reactRedux).useSelector = vi.fn().mockReturnValue(false);
  });

  it('redirects to logout when login server reports a user mismatch', async () => {
    storage.authentication.token.set('Bearer faketoken');

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
    } as any);

    renderHook(() => useInitialRequests());

    await waitFor(() =>
      expect(oauthMocks.clearStorageAndRedirectToLogout).toHaveBeenCalledOnce()
    );
    expect(queryClientMock.prefetchQuery).not.toHaveBeenCalled();
  });

  it('allows through when login server returns no_session (e.g. browser restart cleared the verify cookie)', async () => {
    storage.authentication.token.set('Bearer faketoken');

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    } as any);

    const { result } = renderHook(() => useInitialRequests());

    await waitFor(() => expect(queryClientMock.prefetchQuery).toHaveBeenCalled());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(oauthMocks.clearStorageAndRedirectToLogout).not.toHaveBeenCalled();
  });

  it('allows through when login server returns invalid_token', async () => {
    storage.authentication.token.set('Bearer faketoken');

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    } as any);

    const { result } = renderHook(() => useInitialRequests());

    await waitFor(() => expect(queryClientMock.prefetchQuery).toHaveBeenCalled());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(oauthMocks.clearStorageAndRedirectToLogout).not.toHaveBeenCalled();
  });

  it('runs initial requests when login server confirms the token belongs to the session', async () => {
    storage.authentication.token.set('Bearer faketoken');

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    } as any);

    const { result } = renderHook(() => useInitialRequests());

    await waitFor(() => expect(queryClientMock.prefetchQuery).toHaveBeenCalled());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(oauthMocks.clearStorageAndRedirectToLogout).not.toHaveBeenCalled();
  });

  it('falls back to running initial requests if the verify fetch throws a network error', async () => {
    storage.authentication.token.set('Bearer faketoken');

    global.fetch = vi.fn().mockRejectedValue(new Error('network'));

    const { result } = renderHook(() => useInitialRequests());

    await waitFor(() => expect(queryClientMock.prefetchQuery).toHaveBeenCalled());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(oauthMocks.clearStorageAndRedirectToLogout).not.toHaveBeenCalled();
  });

  it('falls back to running initial requests if Login returns an HTTP error (e.g. 429, 500)', async () => {
    storage.authentication.token.set('Bearer faketoken');

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    } as any);

    const { result } = renderHook(() => useInitialRequests());

    await waitFor(() => expect(queryClientMock.prefetchQuery).toHaveBeenCalled());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(oauthMocks.clearStorageAndRedirectToLogout).not.toHaveBeenCalled();
  });

  it('does not call the verify endpoint for Admin tokens', async () => {
    storage.authentication.token.set('Admin admintoken');

    global.fetch = vi.fn().mockRejectedValue(new Error('should-not-be-called'));

    const { result } = renderHook(() => useInitialRequests());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('does not call the verify endpoint for proxy or delegate sessions', async () => {
    storage.authentication.token.set('Bearer proxytoken');
    setStorage('authentication/parent_token/token', 'Bearer parenttoken');

    global.fetch = vi.fn().mockRejectedValue(new Error('should-not-be-called'));

    const { result } = renderHook(() => useInitialRequests());

    await waitFor(() => expect(queryClientMock.prefetchQuery).toHaveBeenCalled());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(global.fetch).not.toHaveBeenCalled();
    expect(oauthMocks.clearStorageAndRedirectToLogout).not.toHaveBeenCalled();
  });
});
