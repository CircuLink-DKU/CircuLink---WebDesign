import React from 'react';

const ICP_NUMBER = '苏ICP备2026049853号-1';

const Footer: React.FC = () => {
  return (
    <footer className="border-t border-[#b4d3b1] bg-[#315238] px-4 py-5 text-center text-sm text-[#e6f1e2]">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-2 sm:flex-row sm:justify-between">
        <span className="font-semibold tracking-[0.22em]">CIRCULINK</span>
        <a
          href="https://beian.miit.gov.cn/"
          target="_blank"
          rel="noreferrer"
          className="hover:text-white hover:underline"
        >
          {ICP_NUMBER}
        </a>
      </div>
    </footer>
  );
};

export default Footer;
