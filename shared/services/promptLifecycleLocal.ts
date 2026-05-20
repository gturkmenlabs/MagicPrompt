export const getVersionLifecycleLocal = async (_id: string, _ver: string) => {
    return { status: "testing" };
};
export const promoteVersionLocal = async (_id: string, _ver: string, targetStatus: string, _userId?: string) => {
    return { success: true, status: targetStatus };
};
