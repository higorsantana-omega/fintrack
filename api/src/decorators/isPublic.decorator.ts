import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'IS_PUBLIC';

const isPublic = () => SetMetadata(IS_PUBLIC_KEY, true);
export default isPublic;
