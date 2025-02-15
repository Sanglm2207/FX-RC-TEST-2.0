import { IOmnichannelRoom } from '@rocket.chat/core-typings';
import { Field, Button, TextAreaInput, Icon, ButtonGroup, Modal, Box, PaginatedSelectFiltered } from '@rocket.chat/fuselage';
import { useDebouncedValue } from '@rocket.chat/fuselage-hooks';
import { useEndpoint, useTranslation } from '@rocket.chat/ui-contexts';
import React, { ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import { useRecordList } from '../../../hooks/lists/useRecordList';
import { AsyncStatePhase } from '../../../hooks/useAsyncState';
import UserAutoComplete from '../../UserAutoComplete';
import { useDepartmentsList } from '../hooks/useDepartmentsList';
import ModalSeparator from './ModalSeparator';

const ForwardChatModal = ({
	onForward,
	onCancel,
	room,
	...props
}: {
	onForward: (departmentId?: string, userId?: string, comment?: string) => Promise<void>;
	onCancel: () => void;
	room: IOmnichannelRoom;
}): ReactElement => {
	const t = useTranslation();
	const getUserData = useEndpoint('GET', 'users.info');

	const { getValues, handleSubmit, register, setFocus, setValue, watch } = useForm();

	useEffect(() => {
		setFocus('comment');
	}, [setFocus]);

	const department = watch('department');
	const username = watch('username');

	const [departmentsFilter, setDepartmentsFilter] = useState<string | number | undefined>('');
	const debouncedDepartmentsFilter = useDebouncedValue(departmentsFilter, 500);

	const { itemsList: departmentsList, loadMoreItems: loadMoreDepartments } = useDepartmentsList(
		useMemo(() => ({ filter: debouncedDepartmentsFilter as string, enabled: true }), [debouncedDepartmentsFilter]),
	);
	const { phase: departmentsPhase, items: departments, itemCount: departmentsTotal } = useRecordList(departmentsList);
	const hasDepartments = useMemo(() => departments && departments.length > 0, [departments]);

	const _id = { $ne: room.servedBy?._id };
	const conditions = { _id, status: { $ne: 'offline' }, statusLivechat: 'available' };

	const endReached = useCallback(
		(start) => {
			if (departmentsPhase === AsyncStatePhase.LOADING) {
				loadMoreDepartments(start, Math.min(50, departmentsTotal));
			}
		},
		[departmentsPhase, departmentsTotal, loadMoreDepartments],
	);

	const onSubmit = useCallback(
		async ({ department: departmentId, username, comment }) => {
			let uid;

			if (username) {
				const { user } = await getUserData({ userName: username });
				uid = user?._id;
			}

			onForward(departmentId, uid, comment);
		},
		[getUserData, onForward],
	);

	useEffect(() => {
		register('department');
		register('username');
	}, [register]);

	return (
		<Modal {...props} is='form' onSubmit={handleSubmit(onSubmit)}>
			<Modal.Header>
				<Icon name='baloon-arrow-top-right' size={20} />
				<Modal.Title>{t('Forward_chat')}</Modal.Title>
				<Modal.Close onClick={onCancel} />
			</Modal.Header>
			<Modal.Content fontScale='p2'>
				<Field mbe={'x30'}>
					<Field.Label>{t('Forward_to_department')}</Field.Label>
					<Field.Row>
						{
							// TODO: Definitions on fuselage are incorrect, need to be fixed!
							// @ts-ignore-next-line
							<PaginatedSelectFiltered
								withTitle
								filter={departmentsFilter as string}
								setFilter={setDepartmentsFilter}
								options={departments.map(({ _id, name }) => ({ value: _id, label: name }))}
								maxWidth='100%'
								placeholder={t('Select_an_option')}
								onChange={(value: string): void => {
									setValue('department', value);
								}}
								flexGrow={1}
								endReached={endReached}
							/>
						}
					</Field.Row>
				</Field>
				<ModalSeparator text={t('or')} />
				<Field {...(hasDepartments && { mbs: 'x30' })}>
					<Field.Label>{t('Forward_to_user')}</Field.Label>
					<Field.Row>
						<UserAutoComplete
							conditions={conditions}
							flexGrow={1}
							placeholder={t('Username')}
							onChange={(value: string): void => {
								setValue('username', value);
							}}
							value={getValues().username}
						/>
					</Field.Row>
				</Field>
				<Field marginBlock='x15'>
					<Field.Label>
						{t('Leave_a_comment')}{' '}
						<Box is='span' color='neutral-600'>
							({t('Optional')})
						</Box>
					</Field.Label>
					<Field.Row>
						<TextAreaInput {...register('comment')} rows={8} flexGrow={1} />
					</Field.Row>
				</Field>
			</Modal.Content>
			<Modal.Footer>
				<ButtonGroup align='end'>
					<Button onClick={onCancel}>{t('Cancel')}</Button>
					<Button type='submit' disabled={!username && !department} primary>
						{t('Forward')}
					</Button>
				</ButtonGroup>
			</Modal.Footer>
		</Modal>
	);
};

export default ForwardChatModal;
