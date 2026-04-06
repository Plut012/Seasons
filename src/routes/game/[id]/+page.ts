import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
  const res = await fetch(`/api/games/${params.id}`);

  if (!res.ok) {
    return {
      gameId: params.id,
      initialData: null,
      notFound: res.status === 404,
    };
  }

  const data = await res.json();

  return {
    gameId: params.id,
    initialData: data,
    notFound: false,
  };
};
