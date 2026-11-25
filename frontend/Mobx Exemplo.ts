interface Props {
  userId: string;
}

export const useSettings = (params: () => Props) => {
  const [store] = useState(
    () =>
      new MobxQuery({
        queryKey: ['settings'],
      }),
  );

  const getResult = () => {
    const { userId } = params();

    return store.query({
      queryKey: ['settings', userId],
      queryFn: () => getSettings(userId),
      enabled: !!userId,
    });
  };

  return {
    get result() {
      return getResult();
    },

    get settings() {
      return getResult().data;
    },

    get isLoading() {
      return getResult().isLoading;
    },

    get isPending() {
      return getResult().isPending;
    },

    get isError() {
      return getResult().isError;
    },

    get isSuccess() {
      return getResult().isSuccess;
    },

    get error() {
      return getResult().error;
    },

    refetch: () => getResult().refetch(),
  };
};
