import {
  useDirectoryGroups,
  useDirectoryUsers,
} from "@/wab/client/components/app-auth/app-auth-contexts";
import Button from "@/wab/client/components/widgets/Button";
import Checkbox from "@/wab/client/components/widgets/Checkbox";
import Chip from "@/wab/client/components/widgets/Chip";
import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import { ApiEndUser } from "@/wab/shared/ApiSchema";
import { Table } from "antd";
import React from "react";
import { Modal } from "@/wab/client/components/widgets/Modal";

export default function DirectoryUsers(props: {
  teamId: string;
  directoryId: string;
}) {
  const appCtx = useAppCtx();
  const { teamId, directoryId } = props;
  const { users, mutate: mutateUsers } = useDirectoryUsers(appCtx, directoryId);

  const { groups } = useDirectoryGroups(appCtx, directoryId);

  const [selectedUser, setSelectedUser] = React.useState<ApiEndUser | null>(
    null
  );
  const [selectedUserGroups, setSelectedUserGroups] = React.useState<string[]>(
    []
  );

  return (
    <div>
      <div className="b-dashed-lightener2">
        <h3>Directory Users</h3>
        <Button
          onClick={async () => {
            await mutateUsers();
          }}
        >
          Refresh
        </Button>
        <Table
          dataSource={users}
          rowKey="id"
          columns={[
            {
              title: "Email",
              dataIndex: "email",
              key: "email",
            },
            {
              title: "Groups",
              dataIndex: "groups",
              render: (userGroups) => {
                return userGroups.map((group, idx) => {
                  return (
                    <>
                      <Chip key={group.id}>{group.name}</Chip>
                      {idx === userGroups.length - 1 ? null : ", "}
                    </>
                  );
                });
              },
            },
            {
              title: "Actions",
              render: (user) => {
                return (
                  <>
                    <Button
                      onClick={() => {
                        setSelectedUser(user);
                        setSelectedUserGroups(user.groups.map((g) => g.id));
                      }}
                    >
                      Manage groups
                    </Button>
                  </>
                );
              },
            },
          ]}
        />
      </div>
      <Modal
        title={`Manage user ${selectedUser?.email}`}
        visible={!!selectedUser}
        onCancel={() => {
          setSelectedUser(null);
          setSelectedUserGroups([]);
        }}
        footer={null}
      >
        {groups.map((group) => {
          const isSelected = selectedUserGroups.some(
            (groupId) => groupId === group.id
          );
          return (
            <div key={group.id}>
              <Checkbox
                isChecked={isSelected}
                onChange={async (checked) => {
                  if (checked) {
                    setSelectedUserGroups([...selectedUserGroups, group.id]);
                  } else {
                    setSelectedUserGroups(
                      (prev) => prev.filter((g) => g !== group.id) || []
                    );
                  }
                }}
              >
                {group.name}
              </Checkbox>
            </div>
          );
        })}
        <Button
          onClick={async () => {
            await mutateUsers(
              async () => {
                await appCtx.api.updateEndUserGroups(
                  directoryId,
                  selectedUser!.id,
                  selectedUserGroups
                );
                return await appCtx.api.listDirectoryUsers(directoryId);
              },
              {
                optimisticData: users.map((user) => {
                  if (user.id === selectedUser!.id) {
                    return {
                      ...user,
                      groups: selectedUserGroups.map((groupId) => {
                        return groups.find((g) => g.id === groupId)!;
                      }),
                    };
                  }
                  return user;
                }),
              }
            );

            setSelectedUser(null);
            setSelectedUserGroups([]);
          }}
        >
          Save
        </Button>
      </Modal>
    </div>
  );
}
