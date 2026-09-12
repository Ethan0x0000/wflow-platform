import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { WAvatar } from '../src/components/WAvatar';

describe('React Web: WAvatar rendering', () => {
  it('uses a flex box so inherited line-height does not push the avatar down', () => {
    const html = renderToStaticMarkup(<WAvatar name="旅人" src="avatar.png" />);
    expect(html).toContain('display:flex');
  });

  it('does not paint the fallback background over a transparent avatar image', () => {
    const withSrc = renderToStaticMarkup(<WAvatar name="旅人" src="avatar.png" />);
    expect(withSrc).toContain('background-color:transparent');

    const withoutSrc = renderToStaticMarkup(<WAvatar name="旅人" />);
    expect(withoutSrc).toContain('background-color:#1677ff');
  });

  it('keeps the fallback initials when no avatar image is provided', () => {
    const html = renderToStaticMarkup(<WAvatar name="旅人" size={28} showName={false} />);
    expect(html).toContain('旅人');
  });
});
